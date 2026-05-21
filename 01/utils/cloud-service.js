const USER_STORAGE_KEY = 'currentUser';
const USER_INFO_STORAGE_KEY = 'userInfo';
const USER_ROLE_STORAGE_KEY = 'userRole';
const USER_CENTER_FUNCTION_NAME = 'user-center';
function getCloudDatabase() {
  if (!wx.cloud || typeof wx.cloud.database !== 'function') {
    return null;
  }
  try {
    return wx.cloud.database();
  } catch (error) {
    console.warn('cloud-service: cloud database unavailable', error);
    return null;
  }
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
async function callUserCenter(action, payload = {}) {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    throw new Error('云函数不可用');
  }
  const result = await wx.cloud.callFunction({
    name: USER_CENTER_FUNCTION_NAME,
    data: {
      action,
      ...payload
    }
  });
  return result && result.result ? result.result : {};
}
function syncWeChatLogin({ desc = '用于完善你的账号资料' } = {}) {
  return new Promise((resolve, reject) => {
    if (!wx.getUserProfile) {
      reject(new Error('当前版本不支持微信登录授权'));
      return;
    }
    wx.getUserProfile({
      desc,
      success: async (profileRes) => {
        try {
          const result = await callUserCenter('login', {
            profile: profileRes.userInfo || {}
          });
          const user = result.user || result;
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
  try {
    const result = await callUserCenter('me');
    const user = result.user || null;
    if (user) {
      cacheCurrentUser(user);
    }
    return user;
  } catch (error) {
    return getStoredCurrentUser();
  }
}
function logoutCurrentUser() {
  cacheCurrentUser(null);
}
function getUserDisplayName(user = getStoredCurrentUser()) {
  if (!user) {
    return '微信用户';
  }
  return user.nickName || user.userInfo?.nickName || user.nickname || '微信用户';
}
async function loadCollection(collectionName) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error('云数据库不可用');
  }
  const result = await db.collection(collectionName).get();
  return Array.isArray(result.data) ? result.data : [];
}
async function loadCollectionWithFallback(collectionName, fallback = []) {
  try {
    return await loadCollection(collectionName);
  } catch (error) {
    console.warn(`cloud-service: fallback to local data for ${collectionName}`, error);
    return Array.isArray(fallback) ? fallback.slice() : [];
  }
}
async function addDocument(collectionName, data) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error('云数据库不可用');
  }
  return db.collection(collectionName).add({
    data: {
      ...data,
      createTime: data && Object.prototype.hasOwnProperty.call(data, 'createTime')
        ? data.createTime
        : db.serverDate()
    }
  });
}
async function updateDocument(collectionName, docId, data) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error('云数据库不可用');
  }
  return db.collection(collectionName).doc(docId).update({
    data
  });
}
async function removeDocument(collectionName, docId) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error('云数据库不可用');
  }
  return db.collection(collectionName).doc(docId).remove();
}
async function uploadMediaFiles(mediaList = [], prefix = 'uploads') {
  if (!Array.isArray(mediaList) || mediaList.length === 0) {
    return [];
  }
  if (!wx.cloud || typeof wx.cloud.uploadFile !== 'function') {
    throw new Error('云存储不可用');
  }
  const uploadTasks = mediaList.map((media, index) => {
    const filePath = media.tempFilePath || media.filePath || media;
    const cloudPath = `${prefix}/${Date.now()}-${index}-${Math.random().toString(16).slice(2)}.jpg`;
    return wx.cloud.uploadFile({
      cloudPath,
      filePath
    });
  });
  const results = await Promise.all(uploadTasks);
  return results.map((item) => item.fileID);
}
async function createPost({ content, mediaList = [], extra = {} } = {}) {
  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  if (!trimmedContent && (!Array.isArray(mediaList) || mediaList.length === 0)) {
    throw new Error('帖子内容不能为空');
  }
  const currentUser = getStoredCurrentUser();
  const mediaFileIds = await uploadMediaFiles(mediaList, 'posts');
  return addDocument('posts', {
    content: trimmedContent,
    mediaFileIds,
    authorOpenid: currentUser?.openid || '',
    authorName: getUserDisplayName(currentUser),
    authorAvatar: currentUser?.avatarUrl || '',
    authorRole: currentUser?.role || 'user',
    status: 'published',
    ...extra
  });
}
export {
  USER_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
  USER_ROLE_STORAGE_KEY,
  getCloudDatabase,
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
  addDocument,
  updateDocument,
  removeDocument,
  uploadMediaFiles,
  createPost
};
