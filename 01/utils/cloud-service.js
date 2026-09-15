import { request } from './api.js';

const USER_STORAGE_KEY = 'currentUser';
const USER_INFO_STORAGE_KEY = 'userInfo';
const USER_ROLE_STORAGE_KEY = 'userRole';

function noteCloudError() {
  return false;
}

function getCloudDatabase() {
  return null;
}

function getStoredCurrentUser() {
  try {
    return wx.getStorageSync(USER_STORAGE_KEY) || null;
  } catch (error) {
    return null;
  }
}

function cacheCurrentUser(user) {
  try {
    if (user) {
      wx.setStorageSync(USER_STORAGE_KEY, user);
      wx.setStorageSync(USER_INFO_STORAGE_KEY, user);
      wx.setStorageSync(USER_ROLE_STORAGE_KEY, user.role || 'user');
    } else {
      wx.removeStorageSync(USER_STORAGE_KEY);
      wx.removeStorageSync(USER_INFO_STORAGE_KEY);
      wx.removeStorageSync(USER_ROLE_STORAGE_KEY);
    }
  } catch (error) {
    // ignore storage errors in restricted environments
  }
  return user;
}

function isLoggedIn(user = getStoredCurrentUser()) {
  return !!user;
}

function isAdminUser(user = getStoredCurrentUser()) {
  if (!user) {
    return false;
  }
  return user.role === 'admin' || user.isAdmin === true || wx.getStorageSync(USER_ROLE_STORAGE_KEY) === 'admin';
}

function getUserDisplayName(user = getStoredCurrentUser()) {
  if (!user) {
    return '微信用户';
  }
  return user.nickName || user.userInfo?.nickName || user.nickname || '微信用户';
}

async function loadCollection(collectionName, countryZh) {
  const query = countryZh ? `?country=${encodeURIComponent(countryZh)}` : '';
  const pathMap = {
    attractions: `/api/attractions${query}`,
    recommend: `/api/recommend${query}`,
    posts: '/api/posts',
    users: '/api/collections/users'
  };
  const path = pathMap[collectionName] || `/api/collections/${collectionName}`;
  const result = await request(path);
  return Array.isArray(result.data) ? result.data : [];
}

async function loadGuide(countryZh) {
  const query = countryZh ? `?country=${encodeURIComponent(countryZh)}` : '';
  const result = await request(`/api/guide${query}`);
  return result.data || null;
}

async function loadCollectionWithFallback(collectionName, fallback = [], countryZh) {
  try {
    return await loadCollection(collectionName, countryZh);
  } catch (error) {
    console.warn(`api: fallback to local data for ${collectionName}`, error);
    return Array.isArray(fallback) ? fallback.slice() : [];
  }
}

async function addDocument(collectionName, data) {
  const result = await request(`/api/collections/${collectionName}`, {
    method: 'POST',
    data
  });
  return { _id: result._id, id: result.id };
}

async function updateDocument(collectionName, docId, data) {
  return request(`/api/collections/${collectionName}/${docId}`, {
    method: 'PUT',
    data
  });
}

async function removeDocument(collectionName, docId) {
  return request(`/api/collections/${collectionName}/${docId}`, {
    method: 'DELETE'
  });
}

async function uploadMediaFiles() {
  return [];
}

async function createPost({ content, extra = {} } = {}) {
  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  if (!trimmedContent) {
    throw new Error('帖子内容不能为空');
  }

  const currentUser = getStoredCurrentUser();
  return request('/api/posts', {
    method: 'POST',
    data: {
      content: trimmedContent,
      authorOpenid: currentUser?.openid || '',
      authorName: getUserDisplayName(currentUser),
      authorAvatar: currentUser?.avatarUrl || '',
      authorRole: currentUser?.role || 'user',
      ...extra
    }
  });
}

async function syncWeChatLogin({ desc = '用于完善你的账号资料' } = {}) {
  return new Promise((resolve, reject) => {
    if (!wx.getUserProfile) {
      reject(new Error('当前版本不支持微信登录授权'));
      return;
    }

    wx.getUserProfile({
      desc,
      success: async (profileRes) => {
        try {
          const profile = profileRes.userInfo || {};
          const result = await request('/api/auth/login', {
            method: 'POST',
            data: {
              nickName: profile.nickName || '',
              avatarUrl: profile.avatarUrl || '',
              openid: wx.getStorageSync('localOpenid') || ''
            }
          });
          const user = result.user || result;
          if (user && user.openid) {
            wx.setStorageSync('localOpenid', user.openid);
          }
          cacheCurrentUser(user);
          resolve(user);
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) => reject(error)
    });
  });
}

async function refreshCurrentUser() {
  return getStoredCurrentUser();
}

function logoutCurrentUser() {
  cacheCurrentUser(null);
}

async function callUserCenter() {
  throw new Error('请使用微信登录接口');
}

export {
  USER_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
  USER_ROLE_STORAGE_KEY,
  getCloudDatabase,
  noteCloudError,
  getStoredCurrentUser,
  cacheCurrentUser,
  isLoggedIn,
  isAdminUser,
  callUserCenter,
  syncWeChatLogin,
  refreshCurrentUser,
  logoutCurrentUser,
  getUserDisplayName,
  loadCollection,
  loadCollectionWithFallback,
  loadGuide,
  addDocument,
  updateDocument,
  removeDocument,
  uploadMediaFiles,
  createPost
};
