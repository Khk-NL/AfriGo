require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createPool } = require('./db');
const { countryCandidates, normalizeCountryCode } = require('./countries');
const { exchangeWechatCode, issueSession, createAuthMiddleware, requireAdmin, hashToken } = require('./auth');
const { getObjectUrl, uploadImage, resolveMedia } = require('./oss');

const app = express();
const pool = createPool();
const port = Number(process.env.PORT || 3001);
const authenticate = createAuthMiddleware(pool);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin not allowed'));
  }
}));
app.use(express.json({ limit: '2mb' }));

function toPublicUrl(image) {
  if (!image) {
    return '/assets/images/congo-drc.png';
  }
  if (image.startsWith('cloud://')) {
    return '/assets/images/congo-drc.png';
  }
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/assets/')) {
    return image;
  }
  return getObjectUrl(image);
}

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return value;
  }
  if (typeof value !== 'string' || !value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function mapAttraction(row) {
  return {
    id: row.id,
    _id: String(row.id),
    countryCode: row.country_code,
    countryZh: row.country_zh,
    name: row.name,
    image: toPublicUrl(row.image),
    tags: parseJson(row.tags_json, []),
    desc: row.description,
    tips: row.tips
  };
}

function mapRecommend(row) {
  return {
    id: row.id,
    _id: String(row.id),
    countryCode: row.country_code,
    countryZh: row.country_zh,
    category: row.category,
    name: row.name,
    rating: row.rating,
    desc: row.description,
    address: row.address,
    safetyTip: row.safety_tip
  };
}

function mapUser(row) {
  return {
    id: row.id,
    _id: String(row.id),
    openid: row.openid,
    nickName: row.nick_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    isAdmin: row.role === 'admin'
  };
}

function mapPost(row) {
  const storedMedia = parseJson(row.media_urls, []);
  return {
    id: row.id,
    _id: String(row.id),
    content: row.content,
    mediaFileIds: resolveMedia(storedMedia),
    authorOpenid: row.author_openid,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    authorRole: row.author_role,
    status: row.status,
    destinationLabel: row.destination_label,
    createTime: row.created_at
  };
}

function mapBookmark(row) {
  return {
    id: String(row.id),
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    title: row.title,
    category: row.category,
    countryCode: row.country_code,
    payload: parseJson(row.payload_json, {}),
    createTime: row.created_at
  };
}

function mapNotification(row) {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    content: row.content,
    unread: !row.read_at,
    createTime: row.created_at
  };
}

async function listByCountry(table, mapper, countryCode, country) {
  const normalizedCode = normalizeCountryCode(countryCode, country);
  const candidates = countryCandidates(country);
  const sql = normalizedCode
    ? `SELECT * FROM \`${table}\` WHERE country_code = ? ORDER BY id ASC`
    : country
      ? `SELECT * FROM \`${table}\` WHERE country_zh IN (${candidates.map(() => '?').join(',')}) ORDER BY id ASC`
    : `SELECT * FROM \`${table}\` ORDER BY id ASC`;
  const params = normalizedCode ? [normalizedCode] : country ? candidates : [];
  const [rows] = await pool.query(sql, params);
  return rows.map(mapper);
}

function parsePayload(value) {
  if (value && typeof value === 'object') {
    return value;
  }
  return parseJson(value, null);
}

app.post('/api/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const media = await uploadImage(req.file);
    res.json({ ok: true, media });
  } catch (error) {
    next(error);
  }
});

app.post('/api/attractions/:id/image', authenticate, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    const media = await uploadImage(req.file);
    await pool.query('UPDATE attractions SET image = ? WHERE id = ?', [media.objectKey, req.params.id]);
    res.json({ ok: true, media, id: Number(req.params.id) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/attractions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const payload = req.body || {};
    await pool.query(
      'UPDATE attractions SET name = COALESCE(?, name), image = COALESCE(?, image), description = COALESCE(?, description), tips = COALESCE(?, tips), country_zh = COALESCE(?, country_zh) WHERE id = ?',
      [payload.name, payload.image, payload.desc, payload.tips, payload.countryZh, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/attractions', async (req, res) => {
  try {
    const data = await listByCountry('attractions', mapAttraction, req.query.countryCode, req.query.country);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/recommend', async (req, res) => {
  try {
    const data = await listByCountry('recommend', mapRecommend, req.query.countryCode, req.query.country);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/guide', async (req, res) => {
  try {
    const countryCode = normalizeCountryCode(req.query.countryCode, req.query.country);
    const candidates = countryCandidates(req.query.country);
    if (!countryCode && !req.query.country) {
      const [rows] = await pool.query('SELECT country_code, country_zh FROM country_guides ORDER BY id ASC');
      res.json({ ok: true, data: rows.map((row) => ({ countryCode: row.country_code, countryZh: row.country_zh })) });
      return;
    }
    const [rows] = countryCode
      ? await pool.query('SELECT payload, updated_at FROM country_guides WHERE country_code = ? LIMIT 1', [countryCode])
      : await pool.query(
        `SELECT payload, updated_at FROM country_guides WHERE country_zh IN (${candidates.map(() => '?').join(',')}) LIMIT 1`,
        candidates
      );
    if (!rows[0]) {
      res.status(404).json({ ok: false, message: '暂无该国家整合资料' });
      return;
    }
    const guide = parsePayload(rows[0].payload);
    res.json({
      ok: true,
      data: {
        ...guide,
        source: {
          type: 'database',
          label: '服务端整合资料',
          updatedAt: rows[0].updated_at,
          urls: [guide.visa && guide.visa.url, guide.extras && guide.extras.officialSites].filter(Boolean)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/posts', async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM posts WHERE status = 'published' ORDER BY id DESC");
    res.json({ ok: true, data: rows.map(mapPost) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post('/api/posts', authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const mediaFileIds = Array.isArray(body.mediaFileIds) ? body.mediaFileIds.slice(0, 4) : [];
    if (!content && !mediaFileIds.length) {
      res.status(400).json({ ok: false, message: '帖子内容和图片不能同时为空' });
      return;
    }

    const [result] = await pool.query(
      `INSERT INTO posts
        (content, media_urls, author_id, author_openid, author_name, author_avatar, author_role, status, destination_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        content,
        JSON.stringify(mediaFileIds.map((item) => item.objectKey || item).filter(Boolean)),
        req.user.id,
        req.user.openid,
        req.user.nick_name || '微信用户',
        req.user.avatar_url || '',
        req.user.role,
        'published',
        body.destinationLabel || ''
      ]
    );

    await pool.query(
      'INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)',
      [req.user.id, 'publish', '动态发布成功', content ? content.slice(0, 120) : '你的图片动态已发布']
    );

    res.json({ ok: true, _id: String(result.insertId), id: result.insertId });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const body = req.body || {};
    const loginResult = await exchangeWechatCode(body.code);
    const openid = loginResult.openid;
    const nickName = body.nickName || '';
    const avatarUrl = body.avatarUrl || '';
    const [existing] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid]);

    if (existing[0]) {
      await pool.query(
        'UPDATE users SET nick_name = ?, avatar_url = ?, last_login_at = NOW() WHERE id = ?',
        [nickName || existing[0].nick_name, avatarUrl || existing[0].avatar_url, existing[0].id]
      );
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [existing[0].id]);
      const token = await issueSession(pool, rows[0].id);
      res.json({ ok: true, user: mapUser(rows[0]), token });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO users (openid, nick_name, avatar_url, role, last_login_at) VALUES (?, ?, ?, ?, NOW())',
      [openid, nickName, avatarUrl, 'user']
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const token = await issueSession(pool, rows[0].id);
    res.json({ ok: true, user: mapUser(rows[0]), token });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', authenticate, async (req, res, next) => {
  try {
    await pool.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = ?', [hashToken(req.sessionToken)]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ ok: true, user: mapUser(req.user) });
});

app.get('/api/me/posts', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE author_id = ? ORDER BY id DESC', [req.user.id]);
    res.json({ ok: true, data: rows.map(mapPost) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/posts/:id', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT author_id FROM posts WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows[0]) {
      res.status(404).json({ ok: false, message: '帖子不存在' });
      return;
    }
    if (req.user.role !== 'admin' && Number(rows[0].author_id) !== Number(req.user.id)) {
      res.status(403).json({ ok: false, message: '不能删除其他用户的帖子' });
      return;
    }
    await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookmarks', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    res.json({ ok: true, data: rows.map(mapBookmark) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookmarks', authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    const allowedTypes = ['attraction', 'recommend', 'phrase', 'visa'];
    if (!allowedTypes.includes(body.resourceType) || !String(body.resourceId || '').trim() || !String(body.title || '').trim()) {
      res.status(400).json({ ok: false, message: '收藏参数不完整' });
      return;
    }
    const [result] = await pool.query(
      `INSERT INTO bookmarks (user_id, resource_type, resource_id, title, category, country_code, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), category = VALUES(category), payload_json = VALUES(payload_json)`,
      [
        req.user.id,
        body.resourceType,
        String(body.resourceId),
        String(body.title).slice(0, 255),
        String(body.category || '').slice(0, 64),
        normalizeCountryCode(body.countryCode),
        JSON.stringify(body.payload || {})
      ]
    );
    const [rows] = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = ? AND resource_type = ? AND country_code = ? AND resource_id = ? LIMIT 1',
      [req.user.id, body.resourceType, normalizeCountryCode(body.countryCode), String(body.resourceId)]
    );
    res.json({ ok: true, id: rows[0] ? String(rows[0].id) : String(result.insertId || '') });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/bookmarks/:id', authenticate, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM bookmarks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/notifications', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100', [req.user.id]);
    res.json({ ok: true, data: rows.map(mapNotification) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/collections/:name', authenticate, requireAdmin, async (req, res) => {
  const mappers = {
    attractions: mapAttraction,
    recommend: mapRecommend,
    posts: mapPost,
    users: mapUser
  };
  const mapper = mappers[req.params.name];
  if (!mapper) {
    res.status(404).json({ ok: false, message: '未知集合' });
    return;
  }

  try {
    const [rows] = await pool.query(`SELECT * FROM \`${req.params.name}\` ORDER BY id DESC`);
    res.json({ ok: true, data: rows.map(mapper) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post('/api/collections/:name', authenticate, requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    if (req.params.name === 'attractions') {
      const [result] = await pool.query(
        'INSERT INTO attractions (item_key, country_code, country_zh, name, image, tags_json, description, tips) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          String(payload.id || ''),
          normalizeCountryCode(payload.countryCode, payload.countryZh || payload.country),
          payload.countryZh || payload.country || '',
          payload.name || '',
          payload.image || '',
          JSON.stringify(payload.tags || []),
          payload.desc || '',
          payload.tips || ''
        ]
      );
      res.json({ ok: true, _id: String(result.insertId) });
      return;
    }

    if (req.params.name === 'recommend') {
      const [result] = await pool.query(
        'INSERT INTO recommend (item_key, country_code, country_zh, category, name, rating, description, address, safety_tip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          String(payload.id || ''),
          normalizeCountryCode(payload.countryCode, payload.countryZh || payload.country),
          payload.countryZh || payload.country || '',
          payload.category || '',
          payload.name || '',
          payload.rating || '',
          payload.desc || '',
          payload.address || '',
          payload.safetyTip || ''
        ]
      );
      res.json({ ok: true, _id: String(result.insertId) });
      return;
    }

    res.status(400).json({ ok: false, message: '该集合暂不支持新增' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.put('/api/collections/:name/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (req.params.name === 'attractions') {
      await pool.query(
        `UPDATE attractions SET name = ?, image = ?, tags_json = ?, description = ?, tips = ?, country_code = ?, country_zh = ? WHERE id = ?`,
        [body.name || '', body.image || '', JSON.stringify(body.tags || []), body.desc || '', body.tips || '', normalizeCountryCode(body.countryCode, body.countryZh), body.countryZh || '', req.params.id]
      );
    } else if (req.params.name === 'recommend') {
      await pool.query(
        `UPDATE recommend SET category = ?, name = ?, rating = ?, description = ?, address = ?, safety_tip = ?, country_code = ?, country_zh = ? WHERE id = ?`,
        [body.category || '', body.name || '', body.rating || '', body.desc || '', body.address || '', body.safetyTip || '', normalizeCountryCode(body.countryCode, body.countryZh), body.countryZh || '', req.params.id]
      );
    } else if (req.params.name === 'posts') {
      const status = ['published', 'hidden', 'rejected'].includes(body.status) ? body.status : 'published';
      await pool.query('UPDATE posts SET content = ?, status = ? WHERE id = ?', [body.content || '', status, req.params.id]);
    } else if (req.params.name === 'users') {
      const role = body.role === 'admin' ? 'admin' : 'user';
      await pool.query('UPDATE users SET nick_name = ?, role = ? WHERE id = ?', [body.nickName || '', role, req.params.id]);
    } else {
      res.status(404).json({ ok: false, message: '未知集合' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/collections/:name/:id', authenticate, requireAdmin, async (req, res) => {
  const allowed = ['attractions', 'recommend', 'posts', 'users'];
  if (!allowed.includes(req.params.name)) {
    res.status(404).json({ ok: false, message: '未知集合' });
    return;
  }

  try {
    await pool.query(`DELETE FROM \`${req.params.name}\` WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening at http://127.0.0.1:${port}`);
});

app.use((error, _req, res, _next) => {
  const statusCode = Number(error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500));
  if (statusCode >= 500) {
    console.error('request failed', error);
  }
  res.status(statusCode).json({
    ok: false,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? '服务暂时不可用'
      : error.message
  });
});
