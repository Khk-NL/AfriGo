// app.js
import { getStoredLanguage, setStoredLanguage } from './utils/i18n.js';
import { getStoredCurrentUser } from './utils/cloud-service.js';

App({
  onLaunch() {
    if (wx.cloud && typeof wx.cloud.init === 'function') {
      wx.cloud.init({
        env: 'afri-can-d8gis35sc2475c8e6',
        traceUser: true
      })
    }

    setStoredLanguage(getStoredLanguage());

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null,
    language: getStoredLanguage(),
    currentUser: getStoredCurrentUser()
  }
})
 