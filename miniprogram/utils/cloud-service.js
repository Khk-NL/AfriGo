import { request } from './api.js';

import { AUTH_TOKEN_STORAGE_KEY, upload } from './api.js';
import { normalizeCountryCode } from './countries.js';

const { guidesByCode = {} } = require('../data/country-guides.generated.js');

const USER_STORAGE_KEY = 'currentUser';
const USER_INFO_STORAGE_KEY = 'userInfo';

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
    } else {
      wx.removeStorageSync(USER_STORAGE_KEY);
      wx.removeStorageSync(USER_INFO_STORAGE_KEY);
    }
  } catch (error) {
    // ignore storage errors in restricted environments
  }
  return user;
}

function cacheAuthToken(token) {
  try {
    if (token) {
      wx.setStorageSync(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      wx.removeStorageSync(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    // ignore storage errors in restricted environments
  }
}

function isLoggedIn(user = getStoredCurrentUser()) {
  return !!user;
}

function isAdminUser(user = getStoredCurrentUser()) {
  if (!user) {
    return false;
  }
  return user.role === 'admin' || user.isAdmin === true;
}

function getUserDisplayName(user = getStoredCurrentUser()) {
  if (!user) {
    return '微信用户';
  }
  return user.nickName || user.userInfo?.nickName || user.nickname || '微信用户';
}

async function loadCollection(collectionName, countryZh) {
  const countryCode = normalizeCountryCode(countryZh);
  const queryParams = [];
  if (countryCode) queryParams.push(`countryCode=${encodeURIComponent(countryCode)}`);
  if (countryZh) queryParams.push(`country=${encodeURIComponent(countryZh)}`);
  const query = queryParams.length ? `?${queryParams.join('&')}` : '';
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
  const countryCode = normalizeCountryCode(countryZh);
  const queryParams = [];
  if (countryCode) queryParams.push(`countryCode=${encodeURIComponent(countryCode)}`);
  if (countryZh) queryParams.push(`country=${encodeURIComponent(countryZh)}`);
  const query = queryParams.length ? `?${queryParams.join('&')}` : '';
  try {
    const result = await request(`/api/guide${query}`);
    return result.data || null;
  } catch (error) {
    const localGuide = countryCode ? guidesByCode[countryCode] : null;
    if (localGuide) {
      console.warn(`api: fallback to workbook guide for ${countryCode}`, error);
      return localGuide;
    }
    throw error;
  }
}

async function loadCollectionWithFallback(collectionName, fallback = [], countryZh) {
  try {
    const remoteData = await loadCollection(collectionName, countryZh);
    if (remoteData.length) return remoteData;
  } catch (error) {
    console.warn(`api: fallback to local data for ${collectionName}`, error);
  }
  const guide = guidesByCode[normalizeCountryCode(countryZh)];
  const guideField = collectionName === 'attractions'
    ? 'attractionsList'
    : collectionName === 'recommend' ? 'recommendList' : '';
  const workbookFallback = guideField && guide && Array.isArray(guide[guideField]) ? guide[guideField] : [];
  if (workbookFallback.length) return workbookFallback.slice();
  return Array.isArray(fallback) ? fallback.slice() : [];
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

async function uploadMediaFiles(mediaList = []) {
  const uploaded = [];
  for (const media of mediaList.slice(0, 4)) {
    const filePath = media && (media.tempFilePath || media.filePath);
    if (!filePath) continue;
    const result = await upload('/api/upload', filePath);
    if (result.media) uploaded.push(result.media);
  }
  return uploaded;
}

async function createPost({ content, mediaList = [], extra = {} } = {}) {
  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  if (!trimmedContent && !mediaList.length) {
    throw new Error('帖子内容和图片不能同时为空');
  }

  const mediaFileIds = await uploadMediaFiles(mediaList);
  return request('/api/posts', {
    method: 'POST',
    data: {
      content: trimmedContent,
      mediaFileIds,
      ...extra
    }
  });
}

const DEFAULT_PROFILE_DESC = '用于登录与账号识别';

// wx.getUserProfile 的 desc 校验很严格（过长会报 "desc length does not meet the
// requirements"，实测按字节计数），且自 2022 年起对新版本只返回匿名数据。
// 昵称/头像属于可选信息，取不到也必须能登录，因此这里失败只返回空对象。
function readWeChatProfile(desc) {
  return new Promise((resolve) => {
    if (!wx.getUserProfile) {
      resolve({});
      return;
    }
    wx.getUserProfile({
      desc: String(desc || DEFAULT_PROFILE_DESC).slice(0, 9),
      success: (res) => resolve(res.userInfo || {}),
      fail: () => resolve({})
    });
  });
}

// 登录只需要 wx.login 换取的 code；服务端据此建立会话，不依赖用户资料。
async function syncWeChatLogin({ desc = DEFAULT_PROFILE_DESC } = {}) {
  const profile = await readWeChatProfile(desc);
  const loginRes = await new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject });
  });
  if (!loginRes || !loginRes.code) {
    throw new Error('微信登录失败，请稍后重试');
  }
  const result = await request('/api/auth/login', {
    method: 'POST',
    data: {
      nickName: profile.nickName || '',
      avatarUrl: profile.avatarUrl || '',
      code: loginRes.code
    }
  });
  const user = result.user || result;
  cacheAuthToken(result.token || '');
  cacheCurrentUser(user);
  return user;
}

/** 上传头像，返回可长期使用的绝对地址（本地存储模式会返回完整 HTTPS 的 /media 地址）。 */
async function uploadAvatar(filePath) {
  const result = await upload('/api/upload', filePath);
  const media = result.media || {};
  return media.url || '';
}

/** 更新当前用户的昵称与头像；微信已不再下发真实头像昵称，只能由用户自己填写。 */
async function updateMyProfile({ nickName, avatarUrl }) {
  const result = await request('/api/auth/profile', {
    method: 'PUT',
    data: { nickName, avatarUrl }
  });
  return cacheCurrentUser(result.user || null);
}

async function refreshCurrentUser() {
  try {
    const result = await request('/api/auth/me');
    return cacheCurrentUser(result.user || null);
  } catch (error) {
    cacheAuthToken('');
    return cacheCurrentUser(null);
  }
}

async function loadBookmarks() {
  const result = await request('/api/bookmarks');
  return Array.isArray(result.data) ? result.data : [];
}

async function addBookmark(bookmark) {
  return request('/api/bookmarks', { method: 'POST', data: bookmark });
}

async function removeBookmark(bookmarkId) {
  return request(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' });
}

async function loadNotifications() {
  const result = await request('/api/notifications');
  return Array.isArray(result.data) ? result.data : [];
}

async function markNotificationRead(notificationId) {
  return request(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
}

async function loadMyPosts() {
  const result = await request('/api/me/posts');
  return Array.isArray(result.data) ? result.data : [];
}

async function deleteMyPost(postId) {
  return request(`/api/posts/${postId}`, { method: 'DELETE' });
}

async function deleteCurrentAccount() {
  const result = await request('/api/auth/account', { method: 'DELETE' });
  cacheAuthToken('');
  cacheCurrentUser(null);
  return result;
}

async function loadTrips() {
  const result = await request('/api/trips');
  return Array.isArray(result.data) ? result.data : [];
}

async function saveTrip(trip) {
  const id = trip && trip.id;
  const result = await request(id ? `/api/trips/${id}` : '/api/trips', {
    method: id ? 'PUT' : 'POST',
    data: trip
  });
  return result.trip;
}

async function deleteTrip(tripId) {
  return request(`/api/trips/${tripId}`, { method: 'DELETE' });
}

async function cloneTrip(tripId, name = '') {
  const result = await request(`/api/trips/${tripId}/clone`, { method: 'POST', data: { name } });
  return result.trip;
}

async function loadTripExpenses(tripId) {
  const result = await request(`/api/trips/${tripId}/expenses`);
  return Array.isArray(result.data) ? result.data : [];
}

async function addTripExpense(tripId, expense) {
  return request(`/api/trips/${tripId}/expenses`, { method: 'POST', data: expense });
}

async function deleteTripExpense(tripId, expenseId) {
  return request(`/api/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' });
}

async function loadTripReview(tripId) {
  const result = await request(`/api/trips/${tripId}/review`);
  return result.review || null;
}

async function saveTripReview(tripId, review) {
  const result = await request(`/api/trips/${tripId}/review`, { method: 'PUT', data: review });
  return result.review;
}

async function loadServices(countryCode, category = '') {
  const query = [`countryCode=${encodeURIComponent(countryCode || '')}`];
  if (category) query.push(`category=${encodeURIComponent(category)}`);
  const result = await request(`/api/services?${query.join('&')}`);
  return Array.isArray(result.data) ? result.data : [];
}

async function submitServiceLead(payload) {
  return request('/api/service-leads', { method: 'POST', data: payload });
}

async function loadMyServiceLeads() {
  const result = await request('/api/me/service-leads');
  return Array.isArray(result.data) ? result.data : [];
}

async function loadRiskAlerts(countryCode) {
  const result = await request(`/api/risk-alerts?countryCode=${encodeURIComponent(countryCode || '')}`);
  return Array.isArray(result.data) ? result.data : [];
}

async function submitContentCorrection(payload) {
  return request('/api/content-corrections', { method: 'POST', data: payload });
}

async function loadMyContentCorrections() {
  const result = await request('/api/me/content-corrections');
  return Array.isArray(result.data) ? result.data : [];
}

async function translateText({ text, sourceLanguage = 'auto', targetLanguage }) {
  const result = await request('/api/translate', {
    method: 'POST',
    data: { text, sourceLanguage, targetLanguage }
  });
  return result.data;
}

async function planNavigationRoute({ origin, destination, mode = 'driving' }) {
  const result = await request('/api/navigation/routes', {
    method: 'POST',
    data: { origin, destination, mode }
  });
  return result.data;
}

async function togglePostLike(postId) {
  return request(`/api/posts/${postId}/like`, { method: 'POST' });
}

async function loadPostEngagement(postId) {
  return request(`/api/posts/${postId}/engagement`);
}

async function loadPostComments(postId) {
  const result = await request(`/api/posts/${postId}/comments`);
  return Array.isArray(result.data) ? result.data : [];
}

async function createPostComment(postId, content) {
  return request(`/api/posts/${postId}/comments`, { method: 'POST', data: { content } });
}

function logoutCurrentUser() {
  request('/api/auth/logout', { method: 'POST' }).catch(() => {});
  cacheAuthToken('');
  cacheCurrentUser(null);
}

async function callUserCenter() {
  throw new Error('请使用微信登录接口');
}

export {
  USER_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
  getCloudDatabase,
  noteCloudError,
  getStoredCurrentUser,
  cacheCurrentUser,
  isLoggedIn,
  isAdminUser,
  callUserCenter,
  syncWeChatLogin,
  refreshCurrentUser,
  uploadAvatar,
  updateMyProfile,
  logoutCurrentUser,
  getUserDisplayName,
  loadCollection,
  loadCollectionWithFallback,
  loadGuide,
  addDocument,
  updateDocument,
  removeDocument,
  uploadMediaFiles,
  createPost,
  loadBookmarks,
  addBookmark,
  removeBookmark,
  loadNotifications,
  markNotificationRead,
  loadMyPosts,
  deleteMyPost,
  deleteCurrentAccount,
  loadTrips,
  saveTrip,
  deleteTrip,
  cloneTrip,
  loadTripExpenses,
  addTripExpense,
  deleteTripExpense,
  loadTripReview,
  saveTripReview,
  loadServices,
  submitServiceLead,
  loadMyServiceLeads,
  loadRiskAlerts,
  submitContentCorrection,
  loadMyContentCorrections,
  translateText,
  planNavigationRoute,
  togglePostLike,
  loadPostEngagement,
  loadPostComments,
  createPostComment
};
