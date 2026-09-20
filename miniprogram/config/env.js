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
    // 优先本地缓存（真机/模拟器连本机后端时用 wx.setStorageSync('devApiBase', 'http://内网IP:3001') 覆盖）；
    // 没配本地后端时直接走线上 HTTPS，避免模拟器里 127.0.0.1 连接被拒。
    const override = wx.getStorageSync('devApiBase');
    if (override) {
      return String(override).replace(/\/$/, '');
    }
    if (REMOTE_API_BASE && REMOTE_API_BASE.startsWith('https://')) {
      return REMOTE_API_BASE.replace(/\/$/, '');
    }
    return 'http://127.0.0.1:3001';
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
