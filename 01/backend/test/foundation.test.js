const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeCountryCode, normalizeCountryName, countryCandidates } = require('../src/countries');
const { hashToken } = require('../src/auth');
const { assertImage, createObjectKey } = require('../src/oss');
const { loadGuideWorkbook } = require('../src/excel-guide');
const { withStableIds } = require('../src/export-miniprogram-data');
const { validateProductionConfig } = require('../src/config');
const { createRateLimiter } = require('../src/rate-limit');
const { sanitizeTripPayload } = require('../src/trip-plan');
const { sanitizeExpensePayload, sanitizeReviewPayload } = require('../src/trip-review');
const { translateText, validateTranslationInput } = require('../src/translate');

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

test('workbook guides export supported countries with stable content ids', () => {
  const guides = loadGuideWorkbook();
  assert.equal(guides.length, 11);
  assert.ok(guides.every((guide) => /^[A-Z]{2}$/.test(guide.countryCode)));
  const kenya = withStableIds(guides.find((guide) => guide.countryCode === 'KE'));
  assert.ok(kenya.attractionsList.length > 0);
  assert.equal(kenya.attractionsList[0].id, 'KE-attraction-1');
  assert.equal(kenya.recommendList[0].id, 'KE-recommend-1');
});

test('production config requires HTTPS and ECS role credentials', () => {
  const base = {
    NODE_ENV: 'production',
    PUBLIC_BASE_URL: 'https://api.example.com',
    DB_HOST: '127.0.0.1',
    DB_NAME: 'app',
    DB_USER: 'app',
    DB_PASSWORD: 'strong-password',
    WECHAT_APP_ID: 'wx-example-id',
    WECHAT_APP_SECRET: 'strong-secret',
    OSS_REGION: 'oss-cn-hangzhou',
    OSS_BUCKET: 'private-bucket',
    OSS_CREDENTIAL_MODE: 'ecs_ram_role',
    ALIBABA_CLOUD_ECS_METADATA: 'liunianun-oss-role'
  };
  assert.deepEqual(validateProductionConfig(base), []);
  assert.match(validateProductionConfig({ ...base, PUBLIC_BASE_URL: 'http://api.example.com' }).join('；'), /HTTPS/);
  assert.match(validateProductionConfig({ ...base, ALLOW_DEV_AUTH: 'true' }).join('；'), /ALLOW_DEV_AUTH/);
});

test('rate limiter rejects requests after the configured limit', () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60_000, prefix: 'test' });
  const req = { ip: '127.0.0.1', socket: {} };
  const response = {
    headers: {},
    set(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  let nextCalls = 0;
  limiter(req, response, () => { nextCalls += 1; });
  limiter(req, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 429);
});

test('trip plans normalize budget, purpose and checklist input', () => {
  const plan = sanitizeTripPayload({
    countryZh: '肯尼亚',
    purpose: 'business',
    startDate: '2026-10-01',
    endDate: '2026-10-08',
    travelers: 2,
    budget: { transport: '1200.5', food: -20 },
    checklist: [{ title: '护照', done: 1 }, { title: '' }]
  });
  assert.equal(plan.countryCode, 'KE');
  assert.equal(plan.purpose, 'business');
  assert.equal(plan.budget.transport, 1200.5);
  assert.equal(plan.budget.food, 0);
  assert.deepEqual(plan.checklist, [{ id: 'item-1', title: '护照', done: true }]);
  assert.throws(
    () => sanitizeTripPayload({ countryZh: '肯尼亚', startDate: '2026-10-08', endDate: '2026-10-01' }),
    /返程日期/
  );
});

test('translation input enforces language codes and provider limits', () => {
  assert.deepEqual(
    validateTranslationInput({ text: ' 你好 ', sourceLanguage: 'ZH', targetLanguage: 'en' }),
    { text: '你好', sourceLanguage: 'zh', targetLanguage: 'en' }
  );
  assert.throws(() => validateTranslationInput({ text: '', targetLanguage: 'en' }), /请输入/);
  assert.throws(() => validateTranslationInput({ text: 'hello', sourceLanguage: 'en', targetLanguage: 'en' }), /不能相同/);
});

test('trip expenses and reviews reject invalid values', () => {
  assert.deepEqual(
    sanitizeExpensePayload({ category: 'food', amount: '38.456', currency: 'USD', note: '午餐', spentOn: '2026-10-02' }),
    { category: 'food', amount: 38.46, currency: 'USD', note: '午餐', spentOn: '2026-10-02' }
  );
  assert.throws(() => sanitizeExpensePayload({ category: 'unknown', amount: 1 }), /费用分类/);
  assert.throws(() => sanitizeExpensePayload({ category: 'food', amount: 0 }), /费用金额/);
  assert.deepEqual(
    sanitizeReviewPayload({ rating: '5', summary: '顺利完成', highlights: '', lessons: '保留现金' }),
    { rating: 5, summary: '顺利完成', highlights: '', lessons: '保留现金' }
  );
  assert.throws(() => sanitizeReviewPayload({ rating: 6, summary: 'test' }), /评分/);
});

test('translation provider stays closed until explicitly enabled', async () => {
  const previous = process.env.ALIYUN_TRANSLATE_ENABLED;
  process.env.ALIYUN_TRANSLATE_ENABLED = 'false';
  await assert.rejects(
    () => translateText({ text: '你好', sourceLanguage: 'zh', targetLanguage: 'en' }),
    (error) => error.statusCode === 503 && /尚未配置/.test(error.message)
  );
  if (previous === undefined) delete process.env.ALIYUN_TRANSLATE_ENABLED;
  else process.env.ALIYUN_TRANSLATE_ENABLED = previous;
});
