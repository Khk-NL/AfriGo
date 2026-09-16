require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createPool } = require('./db');
const { countryCandidates, normalizeCountryCode } = require('./countries');
const { exchangeWechatCode, issueSession, createAuthMiddleware, requireAdmin, hashToken } = require('./auth');
const { getObjectUrl, initializeOssClient, uploadImage, resolveMedia } = require('./oss');
const { assertProductionConfig } = require('./config');
const { createRateLimiter } = require('./rate-limit');
const { sanitizeTripPayload } = require('./trip-plan');
const { sanitizeExpensePayload, sanitizeReviewPayload } = require('./trip-review');
const { LEAD_STATUSES, sanitizeLeadPayload, sanitizeProviderPayload } = require('./services');
const { translateText } = require('./translate');

const app = express();
const pool = createPool();
const port = Number(process.env.PORT || 3001);
const authenticate = createAuthMiddleware(pool);
const loginLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 20, prefix: 'login' });
const mutationLimiter = createRateLimiter({ windowMs: 60_000, max: 120, prefix: 'mutation' });
const translateLimiter = createRateLimiter({ windowMs: 60_000, max: 30, prefix: 'translate' });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  next();
});
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
app.use('/api/auth/login', loginLimiter);
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return mutationLimiter(req, res, next);
});

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
    createTime: row.created_at,
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0)
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

function mapTripPlan(row) {
  return {
    id: String(row.id),
    name: row.name,
    countryCode: row.country_code,
    countryZh: row.country_zh,
    purpose: row.purpose,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    travelers: Number(row.travelers || 1),
    currency: row.currency,
    budget: parseJson(row.budget_json, {}),
    visa: parseJson(row.visa_json, {}),
    checklist: parseJson(row.checklist_json, []),
    itineraryText: row.itinerary_text || '',
    bookings: parseJson(row.bookings_json, {}),
    createTime: row.created_at,
    updateTime: row.updated_at
  };
}

function mapServiceProvider(row) {
  return {
    id: String(row.id),
    _id: String(row.id),
    countryCode: row.country_code,
    countryZh: row.country_zh,
    category: row.category,
    name: row.name,
    summary: row.summary || '',
    qualificationNote: row.qualification_note || '',
    sourceUrl: row.source_url || '',
    contactChannel: row.contact_channel || '',
    contactValue: row.contact_value || '',
    status: row.status,
    verifiedAt: row.verified_at,
    updateTime: row.updated_at
  };
}

function mapServiceLead(row) {
  return {
    id: String(row.id),
    _id: String(row.id),
    userId: String(row.user_id),
    providerId: row.provider_id ? String(row.provider_id) : '',
    providerName: row.provider_name || '',
    countryCode: row.country_code,
    category: row.category,
    contactName: row.contact_name,
    contactValue: row.contact_value,
    requestText: row.request_text,
    status: row.status,
    createTime: row.created_at,
    updateTime: row.updated_at
  };
}

const TRIP_SELECT = `SELECT id, name, country_code, country_zh, purpose,
  DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
  travelers, currency, budget_json, visa_json, checklist_json,
  itinerary_text, bookings_json, created_at, updated_at
  FROM trip_plans`;

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

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    error.statusCode = 503;
    next(error);
  }
});

app.get('/api/attractions', async (req, res, next) => {
  try {
    const data = await listByCountry('attractions', mapAttraction, req.query.countryCode, req.query.country);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/recommend', async (req, res, next) => {
  try {
    const data = await listByCountry('recommend', mapRecommend, req.query.countryCode, req.query.country);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/guide', async (req, res, next) => {
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
    next(error);
  }
});

app.get('/api/posts', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comment_count
       FROM posts p WHERE p.status = 'published' ORDER BY p.id DESC`
    );
    res.json({ ok: true, data: rows.map(mapPost) });
  } catch (error) {
    next(error);
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

app.post('/api/posts/:id/like', authenticate, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [posts] = await pool.query("SELECT id FROM posts WHERE id = ? AND status = 'published' LIMIT 1", [postId]);
    if (!posts[0]) {
      res.status(404).json({ ok: false, message: '动态不存在' });
      return;
    }
    const [insertResult] = await pool.query('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
    const isLiked = insertResult.affectedRows === 1;
    if (!isLiked) {
      await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    }
    const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?', [postId]);
    res.json({ ok: true, isLiked, likeCount: Number(countRow.total || 0) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:id/engagement', authenticate, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [[likedRow]] = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?) AS is_liked',
      [postId, req.user.id]
    );
    const [[bookmarkRow]] = await pool.query(
      "SELECT id FROM bookmarks WHERE user_id = ? AND resource_type = 'post' AND resource_id = ? LIMIT 1",
      [req.user.id, String(postId)]
    );
    res.json({ ok: true, isLiked: Boolean(likedRow.is_liked), isSaved: Boolean(bookmarkRow && bookmarkRow.id) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:id/comments', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, author_name, content, created_at FROM post_comments WHERE post_id = ? ORDER BY id ASC LIMIT 100',
      [Number(req.params.id)]
    );
    res.json({ ok: true, data: rows.map((row) => ({
      id: String(row.id),
      authorName: row.author_name || '微信用户',
      content: row.content,
      createTime: row.created_at
    })) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:id/comments', authenticate, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const content = String(req.body && req.body.content || '').trim();
    if (!content || content.length > 500) {
      res.status(400).json({ ok: false, message: '评论需为 1-500 个字符' });
      return;
    }
    const [posts] = await pool.query("SELECT id FROM posts WHERE id = ? AND status = 'published' LIMIT 1", [postId]);
    if (!posts[0]) {
      res.status(404).json({ ok: false, message: '动态不存在' });
      return;
    }
    const [result] = await pool.query(
      'INSERT INTO post_comments (post_id, user_id, author_name, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, req.user.nickName || '微信用户', content]
    );
    res.status(201).json({ ok: true, id: String(result.insertId), comment: { authorName: req.user.nickName || '微信用户', content } });
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

app.delete('/api/auth/account', authenticate, async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('DELETE FROM posts WHERE author_id = ?', [req.user.id]);
    await connection.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
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
    const allowedTypes = ['attraction', 'recommend', 'phrase', 'visa', 'post'];
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

app.get('/api/trips', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${TRIP_SELECT} WHERE user_id = ? ORDER BY updated_at DESC`, [req.user.id]);
    res.json({ ok: true, data: rows.map(mapTripPlan) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/trips', authenticate, async (req, res, next) => {
  try {
    const plan = sanitizeTripPayload(req.body || {});
    const [result] = await pool.query(
      `INSERT INTO trip_plans
       (user_id, name, country_code, country_zh, purpose, start_date, end_date, travelers, currency,
        budget_json, visa_json, checklist_json, itinerary_text, bookings_json)
       VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, plan.name, plan.countryCode, plan.countryZh, plan.purpose,
        plan.startDate, plan.endDate, plan.travelers, plan.currency,
        JSON.stringify(plan.budget), JSON.stringify(plan.visa), JSON.stringify(plan.checklist),
        plan.itineraryText, JSON.stringify(plan.bookings)
      ]
    );
    const [rows] = await pool.query(`${TRIP_SELECT} WHERE id = ? AND user_id = ? LIMIT 1`, [result.insertId, req.user.id]);
    res.status(201).json({ ok: true, trip: mapTripPlan(rows[0]) });
  } catch (error) {
    if (/请选择有效|返程日期/.test(error.message || '')) {
      res.status(400).json({ ok: false, message: error.message });
      return;
    }
    next(error);
  }
});

app.put('/api/trips/:id', authenticate, async (req, res, next) => {
  try {
    const plan = sanitizeTripPayload(req.body || {});
    const [result] = await pool.query(
      `UPDATE trip_plans SET name = ?, country_code = ?, country_zh = ?, purpose = ?,
       start_date = NULLIF(?, ''), end_date = NULLIF(?, ''), travelers = ?, currency = ?,
       budget_json = ?, visa_json = ?, checklist_json = ?, itinerary_text = ?, bookings_json = ?
       WHERE id = ? AND user_id = ?`,
      [
        plan.name, plan.countryCode, plan.countryZh, plan.purpose, plan.startDate, plan.endDate,
        plan.travelers, plan.currency, JSON.stringify(plan.budget), JSON.stringify(plan.visa),
        JSON.stringify(plan.checklist), plan.itineraryText, JSON.stringify(plan.bookings),
        req.params.id, req.user.id
      ]
    );
    if (!result.affectedRows) {
      res.status(404).json({ ok: false, message: '行程不存在' });
      return;
    }
    const [rows] = await pool.query(`${TRIP_SELECT} WHERE id = ? AND user_id = ? LIMIT 1`, [req.params.id, req.user.id]);
    res.json({ ok: true, trip: mapTripPlan(rows[0]) });
  } catch (error) {
    if (/请选择有效|返程日期/.test(error.message || '')) {
      res.status(400).json({ ok: false, message: error.message });
      return;
    }
    next(error);
  }
});

app.delete('/api/trips/:id', authenticate, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM trip_plans WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/trips/:id/clone', authenticate, async (req, res, next) => {
  try {
    const [sourceRows] = await pool.query(`${TRIP_SELECT} WHERE id = ? AND user_id = ? LIMIT 1`, [req.params.id, req.user.id]);
    if (!sourceRows[0]) {
      res.status(404).json({ ok: false, message: '行程不存在' });
      return;
    }
    const source = mapTripPlan(sourceRows[0]);
    const checklist = (source.checklist || []).map((item) => ({ ...item, done: false }));
    const plan = sanitizeTripPayload({
      ...source,
      name: String((req.body && req.body.name) || `${source.name}（复用）`).slice(0, 80),
      startDate: '',
      endDate: '',
      visa: { stage: 'not_started', note: '' },
      checklist,
      bookings: { flight: '', hotel: '', localTransport: '' }
    });
    const [result] = await pool.query(
      `INSERT INTO trip_plans
       (user_id, name, country_code, country_zh, purpose, start_date, end_date, travelers, currency,
        budget_json, visa_json, checklist_json, itinerary_text, bookings_json)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, plan.name, plan.countryCode, plan.countryZh, plan.purpose, plan.travelers,
        plan.currency, JSON.stringify(plan.budget), JSON.stringify(plan.visa),
        JSON.stringify(plan.checklist), plan.itineraryText, JSON.stringify(plan.bookings)
      ]
    );
    const [rows] = await pool.query(`${TRIP_SELECT} WHERE id = ? AND user_id = ? LIMIT 1`, [result.insertId, req.user.id]);
    res.status(201).json({ ok: true, trip: mapTripPlan(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/trips/:id/expenses', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.category, e.amount, e.currency,
        DATE_FORMAT(e.spent_on, '%Y-%m-%d') AS spent_on, e.note, e.created_at
       FROM trip_expenses e JOIN trip_plans t ON t.id = e.trip_id
       WHERE e.trip_id = ? AND t.user_id = ? ORDER BY COALESCE(e.spent_on, DATE(e.created_at)) DESC, e.id DESC`,
      [req.params.id, req.user.id]
    );
    res.json({
      ok: true,
      data: rows.map((row) => ({
        id: String(row.id),
        category: row.category,
        amount: Number(row.amount),
        currency: row.currency,
        spentOn: row.spent_on || '',
        note: row.note || '',
        createTime: row.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/trips/:id/expenses', authenticate, async (req, res, next) => {
  try {
    const [trips] = await pool.query('SELECT id, currency FROM trip_plans WHERE id = ? AND user_id = ? LIMIT 1', [req.params.id, req.user.id]);
    if (!trips[0]) {
      res.status(404).json({ ok: false, message: '行程不存在' });
      return;
    }
    const expense = sanitizeExpensePayload(req.body || {});
    const [result] = await pool.query(
      `INSERT INTO trip_expenses (trip_id, user_id, category, amount, currency, note, spent_on)
       VALUES (?, ?, ?, ?, ?, ?, NULLIF(?, ''))`,
      [req.params.id, req.user.id, expense.category, expense.amount, trips[0].currency, expense.note, expense.spentOn]
    );
    res.status(201).json({ ok: true, id: String(result.insertId) });
  } catch (error) {
    if (/费用|金额|日期/.test(error.message || '')) {
      res.status(400).json({ ok: false, message: error.message });
      return;
    }
    next(error);
  }
});

app.delete('/api/trips/:tripId/expenses/:expenseId', authenticate, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `DELETE e FROM trip_expenses e JOIN trip_plans t ON t.id = e.trip_id
       WHERE e.id = ? AND e.trip_id = ? AND t.user_id = ?`,
      [req.params.expenseId, req.params.tripId, req.user.id]
    );
    if (!result.affectedRows) {
      res.status(404).json({ ok: false, message: '费用记录不存在' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/trips/:id/review', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.rating, r.summary, r.highlights, r.lessons, r.updated_at
       FROM trip_reviews r JOIN trip_plans t ON t.id = r.trip_id
       WHERE r.trip_id = ? AND t.user_id = ? LIMIT 1`,
      [req.params.id, req.user.id]
    );
    const review = rows[0] ? {
      rating: Number(rows[0].rating),
      summary: rows[0].summary || '',
      highlights: rows[0].highlights || '',
      lessons: rows[0].lessons || '',
      updateTime: rows[0].updated_at
    } : null;
    res.json({ ok: true, review });
  } catch (error) {
    next(error);
  }
});

app.put('/api/trips/:id/review', authenticate, async (req, res, next) => {
  try {
    const [trips] = await pool.query('SELECT id FROM trip_plans WHERE id = ? AND user_id = ? LIMIT 1', [req.params.id, req.user.id]);
    if (!trips[0]) {
      res.status(404).json({ ok: false, message: '行程不存在' });
      return;
    }
    const review = sanitizeReviewPayload(req.body || {});
    await pool.query(
      `INSERT INTO trip_reviews (trip_id, user_id, rating, summary, highlights, lessons)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), summary = VALUES(summary),
       highlights = VALUES(highlights), lessons = VALUES(lessons)`,
      [req.params.id, req.user.id, review.rating, review.summary, review.highlights, review.lessons]
    );
    res.json({ ok: true, review });
  } catch (error) {
    if (/评分|复盘内容/.test(error.message || '')) {
      res.status(400).json({ ok: false, message: error.message });
      return;
    }
    next(error);
  }
});

app.post('/api/translate', authenticate, translateLimiter, async (req, res, next) => {
  try {
    const data = await translateText(req.body || {});
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/services', async (req, res, next) => {
  try {
    const countryCode = normalizeCountryCode(req.query.countryCode, req.query.country);
    const category = String(req.query.category || '').trim();
    if (req.query.countryCode && !countryCode) {
      res.status(400).json({ ok: false, message: '国家代码不合法' });
      return;
    }
    if (category && !['hotel', 'transport', 'guide', 'insurance'].includes(category)) {
      res.status(400).json({ ok: false, message: '服务分类不合法' });
      return;
    }
    const conditions = ["status = 'approved'"];
    const params = [];
    if (countryCode) {
      conditions.push('country_code = ?');
      params.push(countryCode);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    const [rows] = await pool.query(
      `SELECT id, country_code, country_zh, category, name, summary, qualification_note,
        source_url, status, verified_at, updated_at
       FROM service_providers WHERE ${conditions.join(' AND ')} ORDER BY verified_at DESC, id DESC`,
      params
    );
    res.json({ ok: true, data: rows.map(mapServiceProvider) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/service-leads', authenticate, async (req, res, next) => {
  try {
    const lead = sanitizeLeadPayload(req.body || {});
    const [providers] = await pool.query(
      "SELECT id, country_code, category FROM service_providers WHERE id = ? AND status = 'approved' LIMIT 1",
      [lead.providerId]
    );
    if (!providers[0]) {
      res.status(404).json({ ok: false, message: '服务方不存在或尚未通过审核' });
      return;
    }
    const provider = providers[0];
    const [result] = await pool.query(
      `INSERT INTO service_leads
       (user_id, provider_id, country_code, category, contact_name, contact_value, request_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, provider.id, provider.country_code, provider.category, lead.contactName, lead.contactValue, lead.requestText]
    );
    res.status(201).json({ ok: true, id: String(result.insertId), status: 'new' });
  } catch (error) {
    if (/服务方|联系人|联系方式|服务需求/.test(error.message || '')) {
      res.status(400).json({ ok: false, message: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/me/service-leads', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, p.name AS provider_name FROM service_leads l
       LEFT JOIN service_providers p ON p.id = l.provider_id
       WHERE l.user_id = ? ORDER BY l.id DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ ok: true, data: rows.map(mapServiceLead) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/collections/:name', authenticate, requireAdmin, async (req, res, next) => {
  const mappers = {
    attractions: mapAttraction,
    recommend: mapRecommend,
    posts: mapPost,
    users: mapUser,
    service_providers: mapServiceProvider,
    service_leads: mapServiceLead
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
    next(error);
  }
});

app.post('/api/collections/:name', authenticate, requireAdmin, async (req, res, next) => {
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

    if (req.params.name === 'service_providers') {
      const provider = sanitizeProviderPayload(payload);
      const [result] = await pool.query(
        `INSERT INTO service_providers
         (country_code, country_zh, category, name, summary, qualification_note, source_url,
          contact_channel, contact_value, status, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'approved', NOW(), NULL))`,
        [
          provider.countryCode, provider.countryZh, provider.category, provider.name,
          provider.summary, provider.qualificationNote, provider.sourceUrl,
          provider.contactChannel, provider.contactValue, provider.status, provider.status
        ]
      );
      res.json({ ok: true, _id: String(result.insertId) });
      return;
    }

    res.status(400).json({ ok: false, message: '该集合暂不支持新增' });
  } catch (error) {
    next(error);
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
    } else if (req.params.name === 'service_providers') {
      const provider = sanitizeProviderPayload(body);
      await pool.query(
        `UPDATE service_providers SET country_code = ?, country_zh = ?, category = ?, name = ?,
         summary = ?, qualification_note = ?, source_url = ?, contact_channel = ?, contact_value = ?,
         status = ?, verified_at = CASE WHEN ? = 'approved' THEN COALESCE(verified_at, NOW()) ELSE NULL END
         WHERE id = ?`,
        [
          provider.countryCode, provider.countryZh, provider.category, provider.name,
          provider.summary, provider.qualificationNote, provider.sourceUrl,
          provider.contactChannel, provider.contactValue, provider.status, provider.status, req.params.id
        ]
      );
    } else if (req.params.name === 'service_leads') {
      const status = LEAD_STATUSES.has(body.status) ? body.status : 'new';
      await pool.query('UPDATE service_leads SET status = ? WHERE id = ?', [status, req.params.id]);
    } else {
      res.status(404).json({ ok: false, message: '未知集合' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/collections/:name/:id', authenticate, requireAdmin, async (req, res, next) => {
  const allowed = ['attractions', 'recommend', 'posts', 'users', 'service_providers'];
  if (!allowed.includes(req.params.name)) {
    res.status(404).json({ ok: false, message: '未知集合' });
    return;
  }

  try {
    await pool.query(`DELETE FROM \`${req.params.name}\` WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
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

async function startServer() {
  assertProductionConfig();
  if (process.env.NODE_ENV === 'production') await initializeOssClient();
  const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
  return app.listen(port, host, () => {
    console.log(`API listening at http://${host}:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('API startup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer };
