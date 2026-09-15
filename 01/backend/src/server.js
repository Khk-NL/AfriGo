require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createPool } = require('./db');
const { countryCandidates } = require('./excel-guide');

const app = express();
const pool = createPool();
const port = Number(process.env.PORT || 3001);
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${port}`;
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const PUBLIC_DIR = path.join(__dirname, '../public');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/admin', express.static(PUBLIC_DIR));
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
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
  if (image.startsWith('/uploads/')) {
    return `${PUBLIC_BASE}${image}`;
  }
  return `${PUBLIC_BASE}/uploads/${path.basename(image)}`;
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
  return {
    id: row.id,
    _id: String(row.id),
    content: row.content,
    mediaFileIds: parseJson(row.media_urls, []),
    authorOpenid: row.author_openid,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    authorRole: row.author_role,
    status: row.status,
    destinationLabel: row.destination_label,
    createTime: row.created_at
  };
}

async function listByCountry(table, mapper, country) {
  const candidates = countryCandidates(country);
  const sql = country
    ? `SELECT * FROM \`${table}\` WHERE country_zh IN (${candidates.map(() => '?').join(',')}) ORDER BY id ASC`
    : `SELECT * FROM \`${table}\` ORDER BY id ASC`;
  const params = country ? candidates : [];
  const [rows] = await pool.query(sql, params);
  return rows.map(mapper);
}

function parsePayload(value) {
  if (value && typeof value === 'object') {
    return value;
  }
  return parseJson(value, null);
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, message: '没有收到图片' });
    return;
  }
  const url = `${PUBLIC_BASE}/uploads/${req.file.filename}`;
  res.json({ ok: true, url, filename: req.file.filename });
});

app.post('/api/attractions/:id/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ ok: false, message: '没有收到图片' });
      return;
    }
    const url = `${PUBLIC_BASE}/uploads/${req.file.filename}`;
    await pool.query('UPDATE attractions SET image = ? WHERE id = ?', [url, req.params.id]);
    res.json({ ok: true, url, id: Number(req.params.id) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.put('/api/attractions/:id', async (req, res) => {
  try {
    const payload = req.body || {};
    await pool.query(
      'UPDATE attractions SET name = COALESCE(?, name), image = COALESCE(?, image), description = COALESCE(?, description), tips = COALESCE(?, tips), country_zh = COALESCE(?, country_zh) WHERE id = ?',
      [payload.name, payload.image, payload.desc, payload.tips, payload.countryZh, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
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
    const data = await listByCountry('attractions', mapAttraction, req.query.country);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/recommend', async (req, res) => {
  try {
    const data = await listByCountry('recommend', mapRecommend, req.query.country);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/guide', async (req, res) => {
  try {
    const candidates = countryCandidates(req.query.country);
    if (!req.query.country) {
      const [rows] = await pool.query('SELECT country_zh FROM country_guides ORDER BY id ASC');
      res.json({ ok: true, data: rows.map((row) => row.country_zh) });
      return;
    }
    const [rows] = await pool.query(
      `SELECT payload FROM country_guides WHERE country_zh IN (${candidates.map(() => '?').join(',')}) LIMIT 1`,
      candidates
    );
    if (!rows[0]) {
      res.status(404).json({ ok: false, message: '暂无该国家整合资料' });
      return;
    }
    res.json({ ok: true, data: parsePayload(rows[0].payload) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/posts', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posts ORDER BY id DESC');
    res.json({ ok: true, data: rows.map(mapPost) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const body = req.body || {};
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      res.status(400).json({ ok: false, message: '帖子内容不能为空' });
      return;
    }

    const [result] = await pool.query(
      `INSERT INTO posts
        (content, media_urls, author_openid, author_name, author_avatar, author_role, status, destination_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        content,
        JSON.stringify(body.mediaFileIds || []),
        body.authorOpenid || '',
        body.authorName || '微信用户',
        body.authorAvatar || '',
        body.authorRole || 'user',
        body.status || 'published',
        body.destinationLabel || ''
      ]
    );

    res.json({ ok: true, _id: String(result.insertId), id: result.insertId });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const body = req.body || {};
    const openid = body.openid || `local_${Date.now()}`;
    const nickName = body.nickName || '';
    const avatarUrl = body.avatarUrl || '';
    const [existing] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid]);

    if (existing[0]) {
      await pool.query(
        'UPDATE users SET nick_name = ?, avatar_url = ?, last_login_at = NOW() WHERE id = ?',
        [nickName || existing[0].nick_name, avatarUrl || existing[0].avatar_url, existing[0].id]
      );
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [existing[0].id]);
      res.json({ ok: true, user: mapUser(rows[0]) });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO users (openid, nick_name, avatar_url, role, last_login_at) VALUES (?, ?, ?, ?, NOW())',
      [openid, nickName, avatarUrl, 'user']
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.json({ ok: true, user: mapUser(rows[0]) });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/collections/:name', async (req, res) => {
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

app.post('/api/collections/:name', async (req, res) => {
  try {
    const payload = req.body || {};
    if (req.params.name === 'attractions') {
      const [result] = await pool.query(
        'INSERT INTO attractions (item_key, country_zh, name, image, tags_json, description, tips) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          String(payload.id || ''),
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
        'INSERT INTO recommend (item_key, country_zh, category, name, rating, description, address, safety_tip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          String(payload.id || ''),
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

app.put('/api/collections/:name/:id', async (req, res) => {
  res.status(400).json({ ok: false, message: '请在 1Panel 中修改，或使用对应业务接口' });
});

app.delete('/api/collections/:name/:id', async (req, res) => {
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
