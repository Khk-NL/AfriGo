const REMOTE_API_BASE = 'https://afrigo-api.allezafrique.cn';

function getEnvVersion() {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion || 'develop';
  } catch (error) {
    return 'develop';
  }
}

function getApiBase() {
  const envVersion = getEnvVersion();
  if (envVersion === 'develop') {
    const override = wx.getStorageSync('devApiBase');
    return String(override || 'http://127.0.0.1:3001').replace(/\/$/, '');
  }
  if (!REMOTE_API_BASE) {
    throw new Error('远程 API 域名尚未配置');
  }
  if (!REMOTE_API_BASE.startsWith('https://')) {
    throw new Error('远程 API 必须使用 HTTPS');
  }
  return REMOTE_API_BASE.replace(/\/$/, '');
}

export {
  REMOTE_API_BASE,
  getEnvVersion,
  getApiBase
};
