const crypto = require('crypto');
const OSS = require('ali-oss');
const Credential = require('@alicloud/credentials');

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

let client;
let credentialClient;

function createOssClient(credentials) {
  return new OSS({
    region: process.env.OSS_REGION,
    bucket: process.env.OSS_BUCKET,
    accessKeyId: credentials.accessKeyId,
    accessKeySecret: credentials.accessKeySecret,
    stsToken: credentials.securityToken || process.env.OSS_SESSION_TOKEN,
    refreshSTSTokenInterval: credentials.refreshSTSToken ? 0 : undefined,
    refreshSTSToken: credentials.refreshSTSToken,
    authorizationV4: true,
    secure: true
  });
}

async function initializeOssClient() {
  if (client) return client;
  const baseMissing = ['OSS_REGION', 'OSS_BUCKET'].filter((key) => !process.env[key]);
  if (baseMissing.length) throw Object.assign(new Error(`OSS 配置缺失：${baseMissing.join(', ')}`), { statusCode: 503 });

  if ((process.env.OSS_CREDENTIAL_MODE || 'environment') === 'ecs_ram_role') {
    const credentialsConfig = new Credential.Config({
      type: 'ecs_ram_role',
      roleName: process.env.ALIBABA_CLOUD_ECS_METADATA || undefined
    });
    credentialClient = new Credential.default(credentialsConfig);
    const current = await credentialClient.getCredential();
    client = createOssClient({
      ...current,
      refreshSTSToken: async () => {
        const refreshed = await credentialClient.getCredential();
        return {
          accessKeyId: refreshed.accessKeyId,
          accessKeySecret: refreshed.accessKeySecret,
          stsToken: refreshed.securityToken
        };
      }
    });
    return client;
  }

  const missing = ['OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) throw Object.assign(new Error(`OSS 配置缺失：${missing.join(', ')}`), { statusCode: 503 });
  client = createOssClient({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    securityToken: process.env.OSS_SESSION_TOKEN
  });
  return client;
}

function getClient() {
  if (client) {
    return client;
  }
  if ((process.env.OSS_CREDENTIAL_MODE || 'environment') === 'ecs_ram_role') {
    throw Object.assign(new Error('OSS ECS RAM Role 尚未初始化'), { statusCode: 503 });
  }
  const missing = ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) throw Object.assign(new Error(`OSS 配置缺失：${missing.join(', ')}`), { statusCode: 503 });
  client = createOssClient({ accessKeyId: process.env.OSS_ACCESS_KEY_ID, accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET });
  return client;
}

function assertImage(file) {
  if (!file || !file.buffer) {
    const error = new Error('没有收到图片');
    error.statusCode = 400;
    throw error;
  }
  if (!EXTENSION_BY_MIME[file.mimetype]) {
    const error = new Error('仅支持 JPG、PNG 或 WebP 图片');
    error.statusCode = 400;
    throw error;
  }
}

function createObjectKey(file) {
  const now = new Date();
  const datePath = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, '0')].join('/');
  return `community/${datePath}/${crypto.randomUUID()}${EXTENSION_BY_MIME[file.mimetype]}`;
}

function getObjectUrl(objectKey) {
  const publicBase = String(process.env.OSS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (publicBase) {
    return `${publicBase}/${objectKey}`;
  }
  return getClient().signatureUrl(objectKey, {
    expires: Math.max(60, Number(process.env.OSS_SIGNED_URL_EXPIRES || 3600))
  });
}

async function uploadImage(file) {
  assertImage(file);
  const objectKey = createObjectKey(file);
  await getClient().put(objectKey, file.buffer, {
    headers: {
      'Content-Type': file.mimetype,
      'x-oss-object-acl': 'private',
      'x-oss-forbid-overwrite': 'true'
    }
  });
  return {
    objectKey,
    type: 'image',
    url: getObjectUrl(objectKey)
  };
}

function resolveMedia(mediaList) {
  if (!Array.isArray(mediaList)) {
    return [];
  }
  return mediaList.slice(0, 4).map((media) => {
    if (typeof media === 'string') {
      if (/^https?:\/\//.test(media)) {
        return { objectKey: '', type: 'image', url: media };
      }
      return { objectKey: media, type: 'image', url: getObjectUrl(media) };
    }
    if (!media || !media.objectKey) {
      return null;
    }
    return {
      objectKey: media.objectKey,
      type: media.type || 'image',
      url: getObjectUrl(media.objectKey)
    };
  }).filter(Boolean);
}

module.exports = {
  EXTENSION_BY_MIME,
  assertImage,
  createObjectKey,
  getObjectUrl,
  uploadImage,
  resolveMedia,
  initializeOssClient
};
