const fs = require('fs');
const path = require('path');
const { assertImage, createObjectKey, resolveMedia: resolveWithOss } = require('./oss');

/** 本地磁盘存储根目录；Express 以 /media 前缀对外提供只读访问。 */
const ROOT_DIR = path.join(__dirname, '..', 'var', 'uploads');

function initialize() {
  fs.mkdirSync(ROOT_DIR, { recursive: true });
}

/**
 * 对象键 → 可直接给小程序使用的绝对地址。
 * 必须带域名，小程序 <image> 不接受相对路径。
 */
function getObjectUrl(objectKey) {
  const base = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return `${base}/media/${objectKey}`;
}

async function uploadImage(file) {
  assertImage(file);
  const objectKey = createObjectKey(file);
  const target = path.join(ROOT_DIR, objectKey);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, file.buffer);
  return { objectKey, type: 'image', url: getObjectUrl(objectKey) };
}

function resolveMedia(mediaList) {
  return resolveWithOss(mediaList, getObjectUrl);
}

module.exports = { ROOT_DIR, initialize, getObjectUrl, uploadImage, resolveMedia };
