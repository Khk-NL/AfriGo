const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeCountryCode, normalizeCountryName, countryCandidates } = require('../src/countries');
const { hashToken } = require('../src/auth');
const { assertImage, createObjectKey, resolveMedia } = require('../src/oss');
const { loadGuideWorkbook } = require('../src/excel-guide');
const { withStableIds } = require('../src/export-miniprogram-data');
const { validateProductionConfig } = require('../src/config');
const { createRateLimiter } = require('../src/rate-limit');
const { sanitizeTripPayload } = require('../src/trip-plan');
const { sanitizeExpensePayload, sanitizeReviewPayload } = require('../src/trip-review');
const { sanitizeLeadPayload, sanitizeProviderPayload } = require('../src/services');
const { sanitizeCorrectionPayload, sanitizeRiskAlertPayload } = require('../src/content-trust');
const { translateText, validateTranslationInput } = require('../src/translate');
const { planNavigationRoute, validateNavigationInput } = require('../src/navigation');
const { buildHealthPayload, SERVICE_NAME } = require('../src/health');
const { sanitizeProfilePayload } = require('../src/profile');
const { useLocalStorage } = require('../src/storage');
const local = require('../src/local-storage');
const { sendChatMessage, sanitizeChatMessages } = require('../src/chat');

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
    ALIBABA_CLOUD_ECS_METADATA: 'afrigo-oss-role'
  };
  assert.deepEqual(validateProductionConfig(base), []);
  assert.match(validateProductionConfig({ ...base, PUBLIC_BASE_URL: 'http://api.example.com' }).join('；'), /HTTPS/);
  assert.match(validateProductionConfig({ ...base, ALLOW_DEV_AUTH: 'true' }).join('；'), /ALLOW_DEV_AUTH/);
  assert.match(validateProductionConfig({ ...base, AMAP_NAVIGATION_ENABLED: 'true' }).join('；'), /AMAP_WEB_SERVICE_KEY/);
  assert.match(validateProductionConfig({ ...base, NAVIGATION_PROVIDER: 'amap' }).join('；'), /NAVIGATION_PROVIDER/);
  assert.deepEqual(validateProductionConfig({ ...base, NAVIGATION_PROVIDER: 'mapbox' }), []);
  assert.match(validateProductionConfig({ ...base, AI_PROVIDER: 'gpt' }).join('；'), /AI_PROVIDER/);
  assert.deepEqual(validateProductionConfig({ ...base, AI_PROVIDER: 'deepseek' }), []);
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

test('navigation validates coordinates and stays closed until enabled', async () => {
  assert.deepEqual(
    validateNavigationInput({
      mode: 'walking',
      origin: { longitude: '36.8219462', latitude: '-1.2920659' },
      destination: { longitude: 36.817223, latitude: -1.286389 }
    }),
    {
      mode: 'walking',
      origin: { longitude: 36.821946, latitude: -1.292066 },
      destination: { longitude: 36.817223, latitude: -1.286389 }
    }
  );
  assert.throws(
    () => validateNavigationInput({ origin: { longitude: 181, latitude: 0 }, destination: { longitude: 1, latitude: 1 } }),
    /起点坐标/
  );
  const previousProvider = process.env.NAVIGATION_PROVIDER;
  const previous = process.env.AMAP_NAVIGATION_ENABLED;
  process.env.NAVIGATION_PROVIDER = 'amap-overseas';
  process.env.AMAP_NAVIGATION_ENABLED = 'false';
  await assert.rejects(
    () => planNavigationRoute({ origin: { longitude: 1, latitude: 1 }, destination: { longitude: 2, latitude: 2 } }),
    (error) => error.statusCode === 503 && /尚未配置/.test(error.message)
  );
  const previousKey = process.env.AMAP_WEB_SERVICE_KEY;
  process.env.AMAP_NAVIGATION_ENABLED = 'true';
  process.env.AMAP_WEB_SERVICE_KEY = 'test-key';
  let requestedUrl = '';
  const route = await planNavigationRoute(
    { origin: { longitude: 36.82, latitude: -1.29 }, destination: { longitude: 36.81, latitude: -1.28 } },
    {
      fetchImpl: async (url) => {
        requestedUrl = url;
        return {
          ok: true,
          async json() {
            return { status: '1', route: { paths: [{ distance: '2100', duration: '600', steps: [] }] } };
          }
        };
      }
    }
  );
  assert.match(requestedUrl, /^https:\/\/sg-restapi\.opnavi\.com\/v3\/direction\/driving\?/);
  assert.equal(route.provider, 'amap-overseas');
  assert.equal(route.providerLabel, '高德海外路线');
  assert.equal(route.paths[0].distanceMeters, 2100);
  if (previousProvider === undefined) delete process.env.NAVIGATION_PROVIDER;
  else process.env.NAVIGATION_PROVIDER = previousProvider;
  if (previous === undefined) delete process.env.AMAP_NAVIGATION_ENABLED;
  else process.env.AMAP_NAVIGATION_ENABLED = previous;
  if (previousKey === undefined) delete process.env.AMAP_WEB_SERVICE_KEY;
  else process.env.AMAP_WEB_SERVICE_KEY = previousKey;
});

test('navigation provider is swappable, disabled-aware and fails loud on unknown ids', async () => {
  const payload = { origin: { longitude: 1, latitude: 1 }, destination: { longitude: 2, latitude: 2 } };

  await assert.rejects(
    () => planNavigationRoute(payload, { env: { NAVIGATION_PROVIDER: 'unknown-map' } }),
    (error) => error.statusCode === 503 && /不支持的路线 Provider/.test(error.message)
  );
  await assert.rejects(
    () => planNavigationRoute(payload, { env: { NAVIGATION_PROVIDER: 'disabled' } }),
    (error) => error.statusCode === 503 && /禁用/.test(error.message)
  );
  await assert.rejects(
    () => planNavigationRoute(payload, { env: { NAVIGATION_PROVIDER: 'mapbox' } }),
    (error) => error.statusCode === 503 && /MAPBOX_ACCESS_TOKEN/.test(error.message)
  );
  await assert.rejects(
    () => planNavigationRoute(payload, { env: { NAVIGATION_PROVIDER: 'google-directions' } }),
    (error) => error.statusCode === 503 && /GOOGLE_MAPS_API_KEY/.test(error.message)
  );
  await assert.rejects(
    () => planNavigationRoute(payload, { env: { NAVIGATION_PROVIDER: 'tencent' } }),
    (error) => error.statusCode === 503 && /TENCENT_MAP_KEY/.test(error.message)
  );
});

test('each navigation provider normalizes its own response shape', async () => {
  const input = {
    mode: 'walking',
    origin: { longitude: 36.82, latitude: -1.29 },
    destination: { longitude: 36.81, latitude: -1.28 }
  };

  const mapboxRoute = await planNavigationRoute(input, {
    env: { NAVIGATION_PROVIDER: 'mapbox', MAPBOX_ACCESS_TOKEN: 'test-token' },
    fetchImpl: async (url) => {
      assert.match(url, /^https:\/\/api\.mapbox\.com\/directions\/v5\/mapbox\/walking\/36\.82,-1\.29;36\.81,-1\.28\?/);
      return {
        ok: true,
        async json() {
          return {
            code: 'Ok',
            routes: [{
              distance: 2100.4,
              duration: 600.7,
              legs: [{ steps: [{ maneuver: { instruction: '向东行驶' }, name: 'Kenyatta Ave', distance: 120, duration: 30 }] }]
            }]
          };
        }
      };
    }
  });
  assert.equal(mapboxRoute.provider, 'mapbox');
  assert.equal(mapboxRoute.providerLabel, 'Mapbox 路线');
  assert.equal(mapboxRoute.paths[0].distanceMeters, 2100.4);
  assert.deepEqual(mapboxRoute.paths[0].steps[0], {
    instruction: '向东行驶',
    road: 'Kenyatta Ave',
    distanceMeters: 120,
    durationSeconds: 30
  });

  const googleRoute = await planNavigationRoute(input, {
    env: { NAVIGATION_PROVIDER: 'google-directions', GOOGLE_MAPS_API_KEY: 'test-key' },
    fetchImpl: async (url) => {
      assert.match(url, /origin=-1\.29(%2C|,)36\.82/);
      return {
        ok: true,
        async json() {
          return {
            status: 'OK',
            routes: [{
              legs: [{
                distance: { value: 2100 },
                duration: { value: 601 },
                steps: [{ html_instructions: '向东<b>行驶</b>', distance: { value: 120 }, duration: { value: 30 } }]
              }]
            }]
          };
        }
      };
    }
  });
  assert.equal(googleRoute.provider, 'google-directions');
  assert.equal(googleRoute.paths[0].distanceMeters, 2100);
  assert.equal(googleRoute.paths[0].durationSeconds, 601);
  assert.equal(googleRoute.paths[0].steps[0].instruction, '向东 行驶');

  const tencentRoute = await planNavigationRoute(input, {
    env: { NAVIGATION_PROVIDER: 'tencent', TENCENT_MAP_KEY: 'test-key' },
    fetchImpl: async (url) => {
      assert.match(url, /^https:\/\/apis\.map\.qq\.com\/ws\/direction\/v1\/walking\/\?/);
      assert.match(url, /from=-1\.29(%2C|,)36\.82/);
      assert.match(url, /to=-1\.28(%2C|,)36\.81/);
      assert.match(url, /key=test-key/);
      return {
        ok: true,
        async json() {
          return {
            status: 0,
            message: 'query ok',
            result: {
              routes: [{
                distance: 2100,
                duration: 10,
                restriction: { status: 0 },
                steps: [{ instruction: '沿 Kenyatta Ave 步行2100米,到达终点', road_name: 'Kenyatta Ave', distance: 2100, duration: 10 }]
              }]
            }
          };
        }
      };
    }
  });
  assert.equal(tencentRoute.provider, 'tencent');
  assert.equal(tencentRoute.providerLabel, '腾讯地图路线');
  assert.equal(tencentRoute.paths[0].distanceMeters, 2100);
  assert.equal(tencentRoute.paths[0].durationSeconds, 600);
  assert.equal(tencentRoute.paths[0].restriction, '');
  assert.deepEqual(tencentRoute.paths[0].steps[0], {
    instruction: '沿 Kenyatta Ave 步行2100米,到达终点',
    road: 'Kenyatta Ave',
    distanceMeters: 2100,
    durationSeconds: 600
  });

  await assert.rejects(
    () => planNavigationRoute(input, {
      env: { NAVIGATION_PROVIDER: 'tencent', TENCENT_MAP_KEY: 'bad-key' },
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { status: 311, message: 'key格式错误' };
        }
      })
    }),
    (error) => error.statusCode === 502 && /key格式错误/.test(error.message)
  );

  await assert.rejects(
    () => planNavigationRoute(input, {
      env: { NAVIGATION_PROVIDER: 'mapbox', MAPBOX_ACCESS_TOKEN: 'test-token' },
      fetchImpl: async () => ({ ok: false })
    }),
    (error) => error.statusCode === 502
  );
});

test('missing OSS credentials degrade media instead of blocking startup', () => {
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
    OSS_CREDENTIAL_MODE: 'environment'
  };
  assert.deepEqual(validateProductionConfig(base), []);
  assert.match(
    validateProductionConfig({ ...base, OSS_CREDENTIAL_MODE: 'ecs_ram_role' }).join('；'),
    /ECS RAM Role/
  );
  assert.match(
    validateProductionConfig({ ...base, OSS_CREDENTIAL_MODE: 'ak' }).join('；'),
    /OSS_CREDENTIAL_MODE/
  );

  const keys = ['OSS_PUBLIC_BASE_URL', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET', 'OSS_CREDENTIAL_MODE'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  process.env.OSS_CREDENTIAL_MODE = 'environment';
  try {
    assert.deepEqual(
      resolveMedia(['https://example.com/a.jpg']),
      [{ objectKey: '', type: 'image', url: 'https://example.com/a.jpg' }]
    );
    assert.deepEqual(resolveMedia([{ objectKey: 'community/2026/09/x.jpg' }]), []);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

test('profile updates validate nickname and avatar URL', () => {
  assert.deepEqual(
    sanitizeProfilePayload({ nickName: '  小象  ', avatarUrl: 'https://api.example.com/media/a.jpg' }),
    { nickName: '小象', avatarUrl: 'https://api.example.com/media/a.jpg' }
  );
  assert.deepEqual(sanitizeProfilePayload({ nickName: '小象' }), { nickName: '小象', avatarUrl: '' });
  assert.throws(() => sanitizeProfilePayload({ nickName: '   ' }), /昵称/);
  assert.throws(() => sanitizeProfilePayload({ nickName: '象'.repeat(21) }), /20/);
  // 微信 chooseAvatar 给的是本地临时路径，不能直接存库
  assert.throws(() => sanitizeProfilePayload({ nickName: '小象', avatarUrl: 'wxfile://tmp_a.jpg' }), /HTTPS/);
});

test('media storage falls back to local disk when OSS is not configured', () => {
  assert.equal(useLocalStorage({ STORAGE_PROVIDER: 'local' }), true);
  assert.equal(useLocalStorage({ STORAGE_PROVIDER: 'oss' }), false);
  assert.equal(useLocalStorage({}), true);
  assert.equal(useLocalStorage({
    OSS_REGION: 'oss-cn-hangzhou',
    OSS_BUCKET: 'bucket',
    OSS_CREDENTIAL_MODE: 'environment',
    OSS_ACCESS_KEY_ID: 'id',
    OSS_ACCESS_KEY_SECRET: 'secret'
  }), false);

  const previous = process.env.PUBLIC_BASE_URL;
  process.env.PUBLIC_BASE_URL = 'https://api.example.com/';
  try {
    assert.equal(
      local.getObjectUrl('community/2026/09/a.jpg'),
      'https://api.example.com/media/community/2026/09/a.jpg'
    );
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = previous;
  }
});

test('chat injects the elephant persona and hides provider failures', async () => {
  assert.deepEqual(sanitizeChatMessages([{ role: 'user', content: ' 你好 ' }]), [{ role: 'user', content: '你好' }]);
  assert.throws(() => sanitizeChatMessages([]), /请输入/);
  assert.throws(() => sanitizeChatMessages([{ role: 'assistant', content: 'hi' }]), /最后一条/);

  await assert.rejects(
    () => sendChatMessage([{ role: 'user', content: '你好' }], { env: {} }),
    (error) => error.statusCode === 503 && /DEEPSEEK_API_KEY/.test(error.message)
  );

  let captured = null;
  const result = await sendChatMessage([{ role: 'user', content: '内罗毕安全吗' }], {
    env: { DEEPSEEK_API_KEY: 'test-key' },
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        async json() {
          return {
            model: 'deepseek-chat',
            choices: [{ message: { content: '夜间尽量避免单独出行。' } }],
            usage: { total_tokens: 12 }
          };
        }
      };
    }
  });
  assert.equal(captured.url, 'https://api.deepseek.com/chat/completions');
  assert.match(captured.init.headers.Authorization, /^Bearer test-key$/);
  const body = JSON.parse(captured.init.body);
  assert.equal(body.model, 'deepseek-chat');
  assert.equal(body.messages[0].role, 'system');
  assert.match(body.messages[0].content, /非洲象/);
  assert.deepEqual(body.messages[1], { role: 'user', content: '内罗毕安全吗' });
  assert.equal(result.reply, '夜间尽量避免单独出行。');

  await assert.rejects(
    () => sendChatMessage([{ role: 'user', content: 'hi' }], {
      env: { DEEPSEEK_API_KEY: 'bad' },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        async json() {
          return { error: { message: 'Authentication Fails' } };
        }
      })
    }),
    (error) => error.statusCode === 502 && /鉴权失败/.test(error.message)
  );
});

test('health payload identifies the running build without exposing secrets', () => {
  const payload = buildHealthPayload(
    { NODE_ENV: 'production', NAVIGATION_PROVIDER: 'mapbox', WECHAT_APP_SECRET: 'must-not-appear' },
    { uptimeSeconds: 42, now: Date.parse('2026-09-20T00:00:00.000Z') }
  );
  assert.deepEqual(payload, {
    ok: true,
    service: SERVICE_NAME,
    version: require('../package.json').version,
    env: 'production',
    navigationProvider: 'mapbox',
    uptimeSeconds: 42,
    serverTime: '2026-09-20T00:00:00.000Z'
  });
  assert.equal(JSON.stringify(payload).includes('must-not-appear'), false);
  assert.equal(buildHealthPayload({}, { uptimeSeconds: 1 }).navigationProvider, 'amap-overseas');
});

test('service providers and leads require auditable fields', () => {
  const provider = sanitizeProviderPayload({
    countryZh: '肯尼亚',
    category: 'guide',
    name: '测试服务方',
    sourceUrl: 'https://example.com/provider',
    status: 'approved'
  });
  assert.equal(provider.countryCode, 'KE');
  assert.equal(provider.status, 'approved');
  assert.deepEqual(
    sanitizeLeadPayload({ providerId: '8', contactName: '张三', contactValue: 'wechat-id', requestText: '需要中文向导' }),
    { providerId: 8, contactName: '张三', contactValue: 'wechat-id', requestText: '需要中文向导' }
  );
  assert.throws(() => sanitizeProviderPayload({ countryZh: '肯尼亚', category: 'shopping', name: 'x' }), /服务分类/);
  assert.throws(() => sanitizeLeadPayload({ providerId: 1, contactName: '', contactValue: '', requestText: '' }), /联系人/);
});

test('risk alerts require sources and corrections stay scoped to a country', () => {
  const alert = sanitizeRiskAlertPayload({
    countryZh: '肯尼亚',
    severity: 'high',
    title: '局部道路中断',
    summary: '请绕行并关注后续通知',
    sourceName: '官方机构',
    sourceUrl: 'https://example.com/alert',
    publishedAt: '2026-10-01T00:00:00Z',
    expiresAt: '2026-10-02T00:00:00Z',
    status: 'published'
  });
  assert.equal(alert.countryCode, 'KE');
  assert.equal(alert.status, 'published');
  assert.equal(
    sanitizeCorrectionPayload({ countryZh: '肯尼亚', contentType: 'security', title: '电话已变更', description: '建议复核使馆电话' }).contentType,
    'security'
  );
  assert.throws(() => sanitizeRiskAlertPayload({ countryZh: '肯尼亚', severity: 'high', title: 'x', summary: 'x' }), /来源/);
  assert.throws(() => sanitizeCorrectionPayload({ countryZh: '肯尼亚', contentType: 'unknown', title: 'x', description: 'x' }), /内容类型/);
});
