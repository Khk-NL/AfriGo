const crypto = require('crypto');

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function createWebLoginService({ fetchImpl = fetch, now = Date.now } = {}) {
  const challenges = new Map();
  let accessToken = '';
  let accessTokenExpiresAt = 0;

  function prune() {
    for (const [id, challenge] of challenges) {
      if (challenge.expiresAt <= now()) challenges.delete(id);
    }
  }

  function start() {
    prune();
    if (challenges.size >= 1000) {
      throw Object.assign(new Error('扫码登录请求过多，请稍后重试'), { statusCode: 429 });
    }
    const id = crypto.randomBytes(18).toString('base64url');
    const secret = crypto.randomBytes(32).toString('base64url');
    const expiresAt = now() + CHALLENGE_TTL_MS;
    challenges.set(id, { secretHash: crypto.createHash('sha256').update(secret).digest(), expiresAt, userId: null });
    return { id, secret, expiresAt };
  }

  function get(id) {
    prune();
    const challenge = challenges.get(id);
    if (!challenge) throw Object.assign(new Error('二维码已失效，请重新获取'), { statusCode: 410 });
    return challenge;
  }

  function confirm(id, userId) {
    const challenge = get(id);
    if (challenge.userId) throw Object.assign(new Error('该二维码已确认'), { statusCode: 409 });
    challenge.userId = userId;
  }

  function poll(id, secret) {
    const challenge = get(id);
    const actual = crypto.createHash('sha256').update(String(secret || '')).digest();
    if (!crypto.timingSafeEqual(challenge.secretHash, actual)) {
      throw Object.assign(new Error('登录请求无效'), { statusCode: 403 });
    }
    if (!challenge.userId) return { status: 'pending' };
    challenges.delete(id);
    return { status: 'approved', userId: challenge.userId };
  }

  async function getAccessToken() {
    if (accessToken && accessTokenExpiresAt > now()) return accessToken;
    const appid = process.env.WECHAT_APP_ID;
    const secret = process.env.WECHAT_APP_SECRET;
    if (!appid || !secret) throw Object.assign(new Error('微信小程序凭据未配置'), { statusCode: 503 });
    const response = await fetchImpl('https://api.weixin.qq.com/cgi-bin/stable_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credential', appid, secret, force_refresh: false })
    });
    const result = await response.json();
    if (!response.ok || !result.access_token) {
      throw Object.assign(new Error(`微信 access token 获取失败 (${result.errcode || response.status})`), { statusCode: 502 });
    }
    accessToken = result.access_token;
    accessTokenExpiresAt = now() + Math.max(60, Number(result.expires_in || 7200) - 300) * 1000;
    return accessToken;
  }

  async function qr(id) {
    get(id);
    const token = await getAccessToken();
    const response = await fetchImpl(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: id,
        page: 'pages/web-login/web-login',
        check_path: process.env.WEB_LOGIN_QR_ENV_VERSION !== 'trial',
        env_version: process.env.WEB_LOGIN_QR_ENV_VERSION === 'trial' ? 'trial' : 'release',
        width: 300
      })
    });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.startsWith('image/')) {
      return { contentType, image: Buffer.from(await response.arrayBuffer()) };
    }
    const result = await response.json().catch(() => ({}));
    const code = result.errcode || response.status;
    const message = code === 41030
      ? '微信小程序尚未发布扫码登录页面，请先发布包含该页面的新版本'
      : `微信二维码生成失败 (${code})`;
    throw Object.assign(new Error(message), { statusCode: 503, publicMessage: code === 41030 });
  }

  return { start, confirm, poll, qr };
}

module.exports = { createWebLoginService };
