import { getApiBase } from '../config/env.js';

export const AUTH_TOKEN_STORAGE_KEY = 'authToken';

function getAuthToken() {
  try {
    return wx.getStorageSync(AUTH_TOKEN_STORAGE_KEY) || '';
  } catch (error) {
    return '';
  }
}

export function request(path, { method = 'GET', data } = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBase()}${path}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
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

export function upload(path, filePath, name = 'file') {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getApiBase()}${path}`,
      filePath,
      name,
      header: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
      timeout: 30000,
      success(res) {
        let body;
        try {
          body = JSON.parse(res.data || '{}');
        } catch (error) {
          reject(new Error('上传服务返回了无效数据'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && body.ok !== false) {
          resolve(body);
          return;
        }
        reject(new Error(body.message || `上传失败 ${res.statusCode}`));
      },
      fail: reject
    });
  });
}
