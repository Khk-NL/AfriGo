// app.js
import { getStoredLanguage, setStoredLanguage } from './utils/i18n.js';
import { getStoredCurrentUser } from './utils/cloud-service.js';

App({
  onLaunch() {
    setStoredLanguage(getStoredLanguage());

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  globalData: {
    userInfo: null,
    language: getStoredLanguage(),
    currentUser: getStoredCurrentUser()
  }
})
