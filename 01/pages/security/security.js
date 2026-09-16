import { loadGuide } from '../../utils/cloud-service.js';
import { getSelectedDestination } from '../../utils/countries.js';

Page({
  data: {
    countryNameZh: '肯尼亚',
    countryNameEn: 'Kenya',
    hasData: false,
    overallCrimeIndex: 0,
    crimeTypes: [],
    highRiskAreas: [],
    specialRisk: '',
    embassyWarning: '',
    travelTips: [],
    emergencyChecklist: [],
    embassyPhone: '',
    policePhone: '',
    medicalPhone: '',
    gaugeSweep: 0
  },

  onLoad() {
    const selected = getSelectedDestination();
    const countryNameZh = selected.zhName;
    this.setData({
      countryNameZh,
      countryNameEn: selected.enName || this.data.countryNameEn
    });
    this.loadGuideSecurity(countryNameZh);
  },

  async loadGuideSecurity(countryNameZh) {
    this.setData({ hasData: false });
    try {
      const guide = await loadGuide(countryNameZh);
      if (!guide || !guide.security) {
        return;
      }
      this.setData({
        ...guide.security,
        countryNameZh: guide.security.countryNameZh || countryNameZh,
        hasData: true
      });
    } catch (error) {
      console.warn('security: fallback to local', error);
    }
  },

  onCallEmbassy() {
    wx.makePhoneCall({
      phoneNumber: this.data.embassyPhone,
      fail: () => {
        wx.showToast({
          title: '拨号失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  onCallPolice() {
    wx.makePhoneCall({
      phoneNumber: this.data.policePhone,
      fail: () => {
        wx.showToast({
          title: '拨号失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  onCallMedical() {
    wx.makePhoneCall({
      phoneNumber: this.data.medicalPhone,
      fail: () => {
        wx.showToast({
          title: '拨号失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  onGoBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1
      });
      return;
    }

    wx.switchTab({
      url: '/pages/home/home'
    });
  }
});
