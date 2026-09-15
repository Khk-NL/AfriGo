import { loadGuide } from '../../utils/cloud-service.js';

Page({
  data: {
    languageLabel: '官方语言 / Official Language: 法语 (French)',
    pageTitle: '刚果(金) 风俗与禁忌指南',
    behaviorLines: ['忌用左手递物/进食', '忌触摸他人头部'],
    colorText: '忌纯白/大面积白（哀悼） | 忌纯蓝（殖民记忆） | 忌纯黑（丧色）',
    religionLines: [
      '周日多为安息日，避免安排正式商务/公务活动。',
      '进入教堂须保守着装（禁短裤、无袖），保持安静。'
    ],
    dressMen: '商务需深色西装+领带；日常以T恤+长裤为宜，禁短裤/拖鞋/运动鞋。',
    dressWomen: '商务宜过膝长裙/长裤套装；日常避免过短、透视、露肩。',
    etiquetteChips: ['称呼长辈：Papa / Mama / Chef', '正式称呼：先生/夫人/女士/小姐'],
    etiquetteText: '见面多行握手礼（轻柔且稍久），熟人可拥抱+轻拍后背；对长辈或酋长常以弯腰/半跪致意。',
    customText: '11月1日为逝者节；部分部族有白蚁巢葬、树葬等传统，整体以土葬为主，忌火葬。',
    sourceLines: []
  },

  onLoad() {
    const selected = wx.getStorageSync('selectedDestination') || {};
    const countryName = selected.zhName || '刚果(金)';
    this.setData({
      pageTitle: `${countryName} 风俗与禁忌指南`
    });
    this.loadGuideCustoms(countryName);
  },

  async loadGuideCustoms(countryName) {
    try {
      const guide = await loadGuide(countryName);
      if (!guide || !guide.customs) {
        return;
      }
      this.setData(guide.customs);
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
