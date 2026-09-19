import { buildHealthText, getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';
import { loadGuide } from '../../utils/cloud-service.js';
import { getSelectedDestination } from '../../utils/countries.js';

Page({
  data: {
    language: getStoredLanguage(),
    countryName: '肯尼亚',
    uiText: buildHealthText(getStoredLanguage(), '肯尼亚'),
    hasData: false,
    tickerText: '',
    emergencyPhone: '112',
    hospitals: [],
    malariaOpen: false,
    malariaTips: []
  },

  applyLanguage(language, countryName = this.data.countryName) {
    const nextLanguage = normalizeLanguage(language);
    const localeText = buildHealthText(nextLanguage, countryName);
    this.setData({
      language: nextLanguage,
      uiText: localeText,
      tickerText: localeText.tickerText,
      malariaTips: localeText.malariaTips
    });
  },

  onLoad() {
    const cached = getSelectedDestination();
    const countryName = cached.zhName;
    this.setData({ countryName });
    this.applyLanguage(getStoredLanguage(), countryName);
    this.loadGuideHealth(countryName);
  },

  async loadGuideHealth(countryName) {
    this.setData({ hasData: false });
    try {
      const guide = await loadGuide(countryName);
      if (!guide || !guide.health) {
        return;
      }
      const uiText = {
        ...this.data.uiText,
        entryMustDesc: guide.health.entryMustDesc || this.data.uiText.entryMustDesc
      };
      this.setData({
        hasData: true,
        uiText,
        tickerText: guide.health.tickerText || this.data.tickerText,
        hospitals: Array.isArray(guide.health.hospitals) ? guide.health.hospitals : [],
        malariaTips: Array.isArray(guide.health.malariaTips) ? guide.health.malariaTips : [],
        emergencyPhone: guide.health.emergencyPhone || this.data.emergencyPhone
      });
    } catch (error) {
      console.warn('health: fallback to local', error);
    }
  },

  onGoBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }

    wx.switchTab({ url: '/pages/home/home' });
  },

  onCallEmergency() {
    wx.makePhoneCall({
      phoneNumber: this.data.emergencyPhone,
      fail: () => {
        wx.showToast({
          title: this.data.uiText.emergencyToast,
          icon: 'none'
        });
      }
    });
  },

  onCallHospital(e) {
    const { phone } = e.currentTarget.dataset;
    if (!phone) return;

    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({
          title: this.data.uiText.emergencyToast,
          icon: 'none'
        });
      }
    });
  },

  onToggleMalaria() {
    this.setData({ malariaOpen: !this.data.malariaOpen });
  }
});
