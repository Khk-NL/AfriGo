// 01/pages/recommend/recommend.js
import { loadCollectionWithFallback } from '../../utils/cloud-service.js';
import { decorateBookmarks, toggleBookmark } from '../../utils/bookmarks.js';

const recLib = require('../../data/recommend.js');

const getCountryCandidates = (countryZh) => {
  const rawCountry = typeof countryZh === 'string' ? countryZh.trim() : '';
  const candidates = [];

  if (rawCountry) {
    candidates.push(rawCountry);
  }

  const aliasCountry = rawCountry.replace(/[()]/g, '');
  if (aliasCountry && aliasCountry !== rawCountry) {
    candidates.push(aliasCountry);
  }

  return candidates;
};

const pickCountryList = (sourceMap, countryZh) => {
  const candidates = getCountryCandidates(countryZh);

  for (const candidate of candidates) {
    if (Array.isArray(sourceMap[candidate])) {
      return sourceMap[candidate];
    }
  }

  return [];
};

const pickCloudCountryList = (docs, countryZh) => {
  if (!Array.isArray(docs)) {
    return [];
  }

  const candidates = getCountryCandidates(countryZh);
  const matched = docs.filter((item) => candidates.includes(item.countryZh || item.country || item.destination || item.region || item.area));
  const anonymous = docs.filter((item) => !item.countryZh && !item.country && !item.destination && !item.region && !item.area);
  const list = matched.length ? matched : (anonymous.length ? anonymous : docs);

  return list.map((item) => ({
    ...item,
    id: item.id || item._id
  }));
};

Page({
  data: {
    currentCountry: "",
    categories: ["全部", "美食", "住宿", "交通", "活动"],
    activeCategory: "全部",
    searchKeyword: "",
    displayList: [],
    fullList: [],
    summaryCount: 0
  },

  onLoad: function() {
    const selected = wx.getStorageSync('selectedDestination') || { zhName: "刚果金" };
    this.loadRecommendations(selected.zhName);
  },

  onShow: function() {
    const selected = wx.getStorageSync('selectedDestination') || { zhName: "刚果金" };
    if (selected.zhName !== this.data.currentCountry || !this.data.fullList || !this.data.fullList.length) {
      this.loadRecommendations(selected.zhName);
    }
  },

  async loadRecommendations(countryZh) {
    const localFallback = pickCountryList(recLib.recommend, countryZh);
    const docs = await loadCollectionWithFallback('recommend', localFallback, countryZh);
    const cloudList = pickCloudCountryList(docs, countryZh);
    let nextList = cloudList.length ? cloudList : localFallback;
    try {
      nextList = await decorateBookmarks(nextList, 'recommend');
    } catch (error) {
      console.warn('recommend: load bookmarks failed', error);
    }
    this.setData({
      currentCountry: countryZh,
      displayList: nextList,
      fullList: nextList,
      summaryCount: nextList.length,
      searchKeyword: '',
      activeCategory: '全部'
    });
  },

  async onBookmarkTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.fullList.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    try {
      const state = await toggleBookmark('recommend', item, {
        title: item.name,
        category: item.category || '出行推荐',
        payload: { address: item.address, desc: item.desc, safetyTip: item.safetyTip }
      });
      const fullList = this.data.fullList.map((entry) => String(entry.id) === String(id) ? { ...entry, ...state } : entry);
      this.setData({ fullList }, () => this.applyFilters());
      wx.showToast({ title: state.isBookmarked ? '已收藏' : '已取消收藏', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '收藏失败', icon: 'none' });
    }
  },

  onTagTap: function(e) {
    const category = e.currentTarget.dataset.tag;
    this.setData({ activeCategory: category }, () => this.applyFilters());
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value || '' }, () => this.applyFilters());
  },

  applyFilters() {
    const keyword = String(this.data.searchKeyword || '').trim().toLowerCase();
    const displayList = this.data.fullList.filter((item) => {
      const matchesCategory = this.data.activeCategory === '全部' || item.category === this.data.activeCategory;
      const searchable = [item.name, item.category, item.address, item.desc, item.safetyTip].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && (!keyword || searchable.includes(keyword));
    });
    this.setData({ displayList });
  },

  onCardTap(e) {
    const { name, address, desc, safetyTip } = e.currentTarget.dataset;
    wx.showModal({
      title: name || '出行推荐',
      content: [address, desc, safetyTip ? `安全提示：${safetyTip}` : ''].filter(Boolean).join('\n\n'),
      showCancel: false
    });
  },

  onGoHomeTap() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  onBackTap: function() {
    wx.navigateBack();
  }
});
