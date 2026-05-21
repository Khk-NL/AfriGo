import { buildHealthText, getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';

Page({
  data: {
    language: getStoredLanguage(),
    countryName: '刚果(金)',
    uiText: buildHealthText(getStoredLanguage(), '刚果(金)'),
    tickerText: '',
    emergencyPhone: '112',
    hospitals: [
      {
        name: '中刚医疗中心（金沙萨）',
        address: '金沙萨市中心大道 21 号',
        phone: '+243818888888'
      },
      {
        name: '瑞辰医院（卢本巴希）',
        address: '卢本巴希矿业新区健康街 9 号',
        phone: '+243816666666'
      }
    ],
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
    const cached = wx.getStorageSync('selectedDestination') || {};
    const countryName = cached.zhName || '刚果(金)';
    this.setData({ countryName });
    this.applyLanguage(getStoredLanguage(), countryName);
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
