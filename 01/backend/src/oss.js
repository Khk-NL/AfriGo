const crypto = require('crypto');
const OSS = require('ali-oss');

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

let client;

function getClient() {
  if (client) {
    return client;
  }

  const required = ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    const error = new Error(`OSS 配置缺失：${missing.join(', ')}`);
    error.statusCode = 503;
    throw error;
  }

  client = new OSS({
    region: process.env.OSS_REGION,
    bucket: process.env.OSS_BUCKET,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    authorizationV4: true,
    secure: true
  });
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
  resolveMedia
};
