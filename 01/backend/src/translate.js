const Credential = require('@alicloud/credentials');
const OpenApi = require('@alicloud/openapi-core');
const Alimt = require('@alicloud/alimt20181012');

let client;

function validateTranslationInput(payload = {}) {
  const text = String(payload.text || '').trim();
  const sourceLanguage = String(payload.sourceLanguage || 'auto').trim().toLowerCase();
  const targetLanguage = String(payload.targetLanguage || '').trim().toLowerCase();
  if (!text) throw Object.assign(new Error('请输入要翻译的内容'), { statusCode: 400 });
  if (text.length > 5000) throw Object.assign(new Error('单次翻译不能超过 5000 字符'), { statusCode: 400 });
  if (!/^(auto|[a-z]{2,3}(?:-[a-z]{2,4})?)$/.test(sourceLanguage) || !/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(targetLanguage)) {
    throw Object.assign(new Error('语言代码不合法'), { statusCode: 400 });
  }
  if (sourceLanguage === targetLanguage) throw Object.assign(new Error('源语言和目标语言不能相同'), { statusCode: 400 });
  return { text, sourceLanguage, targetLanguage };
}

function createCredentialClient() {
  const roleName = process.env.ALIBABA_CLOUD_ECS_METADATA;
  if (roleName) {
    return new Credential.default(new Credential.Config({
      type: 'ecs_ram_role',
      roleName,
      disableIMDSv1: String(process.env.ALIBABA_CLOUD_IMDSV1_DISABLE).toLowerCase() === 'true'
    }));
  }
  return new Credential.default();
}

function getTranslateClient() {
  if (String(process.env.ALIYUN_TRANSLATE_ENABLED).toLowerCase() !== 'true') {
    throw Object.assign(new Error('翻译服务尚未配置'), { statusCode: 503 });
  }
  if (!client) {
    const config = new OpenApi.$OpenApiUtil.Config({
      credential: createCredentialClient(),
      endpoint: process.env.ALIYUN_TRANSLATE_ENDPOINT || 'mt.cn-hangzhou.aliyuncs.com',
      regionId: process.env.ALIYUN_TRANSLATE_REGION || 'cn-hangzhou',
      protocol: 'https',
      connectTimeout: 5000,
      readTimeout: 10000
    });
    client = new Alimt.default(config);
  }
  return client;
}

async function translateText(payload) {
  const input = validateTranslationInput(payload);
  const request = new Alimt.TranslateGeneralRequest({
    formatType: 'text',
    scene: 'general',
    sourceLanguage: input.sourceLanguage,
    sourceText: input.text,
    targetLanguage: input.targetLanguage
  });
  const response = await getTranslateClient().translateGeneral(request);
  const body = response && response.body;
  if (!body || Number(body.code) !== 200 || !body.data || !body.data.translated) {
    throw Object.assign(new Error((body && body.message) || '翻译服务返回异常'), { statusCode: 502 });
  }
  return {
    translated: body.data.translated,
    detectedLanguage: body.data.detectedLanguage || input.sourceLanguage,
    wordCount: body.data.wordCount || '',
    provider: 'aliyun-alimt'
  };
}

module.exports = {
  validateTranslationInput,
  translateText
};
