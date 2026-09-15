export const API_BASE = 'http://127.0.0.1:3001';

export function request(path, { method = 'GET', data } = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header: {
        'content-type': 'application/json'
      },
      timeout: 12000,
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && body.ok !== false) {
          resolve(body);
          return;
        }
        reject(new Error(body.message || `请求失败 ${res.statusCode}`));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}
