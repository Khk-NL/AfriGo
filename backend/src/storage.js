const oss = require('./oss');
const local = require('./local-storage');

/**
 * 媒体存储按可替换 Provider 组织，与地图、翻译一致：
 *   STORAGE_PROVIDER=oss    阿里云 OSS（私有 Bucket + 签名 URL）
 *   STORAGE_PROVIDER=local  服务器本地磁盘（/media 前缀对外提供）
 * 未显式配置时：OSS 凭据齐全就用 OSS，否则退回本地磁盘，保证图片功能可用。
 * @param {object} [env] 环境变量来源。
 * @returns {boolean} 是否使用本地磁盘。
 */
function useLocalStorage(env = process.env) {
  const configured = String(env.STORAGE_PROVIDER || '').trim().toLowerCase();
  if (configured === 'local') return true;
  if (configured === 'oss') return false;
  return !oss.isConfigured(env);
}

function currentProvider() {
  return useLocalStorage() ? local : oss;
}

/** 启动时初始化：本地模式建目录，OSS 模式取 STS 凭据。 */
async function initializeStorage() {
  if (useLocalStorage()) {
    local.initialize();
    console.log(`媒体存储：本地磁盘 ${local.ROOT_DIR}`);
    return;
  }
  await oss.initializeOssClient();
  console.log('媒体存储：阿里云 OSS');
}

function uploadImage(file) {
  return currentProvider().uploadImage(file);
}

function getObjectUrl(objectKey) {
  return currentProvider().getObjectUrl(objectKey);
}

function resolveMedia(mediaList) {
  return currentProvider().resolveMedia(mediaList);
}

/** Express 静态目录用；非本地模式返回的目录为空，只会 404。 */
function localStorageRoot() {
  return local.ROOT_DIR;
}

module.exports = {
  useLocalStorage,
  initializeStorage,
  uploadImage,
  getObjectUrl,
  resolveMedia,
  localStorageRoot
};
