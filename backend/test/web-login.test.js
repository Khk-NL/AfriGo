const test = require('node:test');
const assert = require('node:assert/strict');
const { createWebLoginService } = require('../src/web-login');

test('a QR challenge requires the browser secret and can only be consumed once', () => {
  const login = createWebLoginService();
  const challenge = login.start();
  assert.equal(login.poll(challenge.id, challenge.secret).status, 'pending');
  assert.throws(() => login.poll(challenge.id, 'wrong'), { statusCode: 403 });
  login.confirm(challenge.id, 12);
  assert.throws(() => login.confirm(challenge.id, 13), { statusCode: 409 });
  assert.deepEqual(login.poll(challenge.id, challenge.secret), { status: 'approved', userId: 12 });
  assert.throws(() => login.poll(challenge.id, challenge.secret), { statusCode: 410 });
});

test('a QR challenge expires after five minutes', () => {
  let time = 1000;
  const login = createWebLoginService({ now: () => time });
  const challenge = login.start();
  time += 5 * 60 * 1000;
  assert.throws(() => login.confirm(challenge.id, 12), { statusCode: 410 });
});

test('QR generation binds the random challenge to the mini program page', async () => {
  const previous = { id: process.env.WECHAT_APP_ID, secret: process.env.WECHAT_APP_SECRET };
  process.env.WECHAT_APP_ID = 'test-app';
  process.env.WECHAT_APP_SECRET = 'test-secret';
  const calls = [];
  const login = createWebLoginService({ fetchImpl: async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (url.includes('stable_token')) return { ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 7200 }) };
    return { ok: true, headers: new Headers({ 'Content-Type': 'image/png' }), arrayBuffer: async () => Uint8Array.from([1,2,3]).buffer };
  } });
  try {
    const challenge = login.start();
    const result = await login.qr(challenge.id);
    assert.equal(result.contentType, 'image/png');
    assert.deepEqual([...result.image], [1,2,3]);
    assert.equal(calls[1].body.scene, challenge.id);
    assert.equal(calls[1].body.page, 'pages/web-login/web-login');
    assert.equal(calls[1].body.env_version, 'release');
    assert.equal(calls[1].body.check_path, true);
  } finally {
    if (previous.id === undefined) delete process.env.WECHAT_APP_ID; else process.env.WECHAT_APP_ID = previous.id;
    if (previous.secret === undefined) delete process.env.WECHAT_APP_SECRET; else process.env.WECHAT_APP_SECRET = previous.secret;
  }
});
