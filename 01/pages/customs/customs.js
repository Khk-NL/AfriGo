import { loadGuide } from '../../utils/cloud-service.js';
import { getSelectedDestination } from '../../utils/countries.js';

Page({
  data: {
    languageLabel: '',
    pageTitle: '肯尼亚 风俗与禁忌指南',
    hasData: false,
    behaviorLines: [],
    colorText: '',
    religionLines: [],
    dressMen: '',
    dressWomen: '',
    etiquetteChips: [],
    etiquetteText: '',
    customText: '',
    sourceLines: []
  },

  onLoad() {
    const selected = getSelectedDestination();
    const countryName = selected.zhName;
    this.setData({
      pageTitle: `${countryName} 风俗与禁忌指南`
    });
    this.loadGuideCustoms(countryName);
  },

  async loadGuideCustoms(countryName) {
    this.setData({ hasData: false });
    try {
      const guide = await loadGuide(countryName);
      if (!guide || !guide.customs) {
        return;
      }
      this.setData({ ...guide.customs, hasData: true });
    } catch (error) {
      console.warn('customs: fallback to local', error);
    }
  },

  onGoBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }

    wx.switchTab({
      url: '/pages/home/home'
    });
  }
});
