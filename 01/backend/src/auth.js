const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function exchangeWechatCode(code) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment && process.env.ALLOW_DEV_AUTH === 'true' && code === 'dev-login') {
    return { openid: process.env.DEV_AUTH_OPENID || 'dev-user' };
  }

  if (!code) {
    throw Object.assign(new Error('缺少微信登录 code'), { statusCode: 400 });
  }

  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) {
    throw Object.assign(new Error('服务端未配置微信登录凭据'), { statusCode: 503 });
  }

  const params = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: 'authorization_code'
  });
  const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params}`);
  const result = await response.json();
  if (!response.ok || !result.openid) {
    const error = new Error(result.errmsg || '微信登录凭据校验失败');
    error.statusCode = 401;
    throw error;
  }
  return result;
}

async function issueSession(pool, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const ttlDays = Math.max(1, Number(process.env.SESSION_TTL_DAYS || 7));
  await pool.query(
    'INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [userId, tokenHash, ttlDays]
  );
  return token;
}

function createAuthMiddleware(pool) {
  return async function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({ ok: false, message: '请先登录' });
      return;
    }

    try {
      const [rows] = await pool.query(
        `SELECT u.* FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
         LIMIT 1`,
        [hashToken(match[1])]
      );
      if (!rows[0]) {
        res.status(401).json({ ok: false, message: '登录状态已失效' });
        return;
      }
      req.user = rows[0];
      req.sessionToken = match[1];
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ ok: false, message: '仅管理员可执行此操作' });
    return;
  }
  next();
}

module.exports = {
  hashToken,
  exchangeWechatCode,
  issueSession,
  createAuthMiddleware,
  requireAdmin
};
