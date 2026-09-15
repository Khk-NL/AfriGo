const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeCountryCode, normalizeCountryName, countryCandidates } = require('../src/countries');
const { hashToken } = require('../src/auth');
const { assertImage, createObjectKey } = require('../src/oss');

test('country names resolve to stable ISO codes', () => {
  assert.equal(normalizeCountryCode('肯尼亚'), 'KE');
  assert.equal(normalizeCountryCode('cd'), 'CD');
  assert.equal(normalizeCountryCode('', '刚果金'), 'CD');
  assert.equal(normalizeCountryName('刚果金'), '刚果(金)');
  assert.deepEqual(countryCandidates('刚果（金）'), ['刚果(金)', '刚果金']);
});

test('session tokens are stored as hashes', () => {
  const token = 'example-session-token';
  const hashed = hashToken(token);
  assert.equal(hashed.length, 64);
  assert.notEqual(hashed, token);
  assert.equal(hashed, hashToken(token));
});

test('OSS object keys are generated under the community prefix', () => {
  const key = createObjectKey({ mimetype: 'image/jpeg' });
  assert.match(key, /^community\/\d{4}\/\d{2}\/[0-9a-f-]+\.jpg$/);
});

test('uploads reject unsupported content types', () => {
  assert.throws(
    () => assertImage({ buffer: Buffer.from('x'), mimetype: 'text/plain' }),
    /仅支持 JPG、PNG 或 WebP 图片/
  );
});
