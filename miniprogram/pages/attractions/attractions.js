// miniprogram/pages/attractions/attractions.js
import { loadCollectionWithFallback } from '../../utils/cloud-service.js';
import { decorateBookmarks, toggleBookmark } from '../../utils/bookmarks.js';
import { getSelectedDestination } from '../../utils/countries.js';

const attrLib = require('../../data/attractions.js');

const hasUsableImage = (image) => {
  if (!image || typeof image !== 'string') {
    return false;
  }
  return image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/assets/images/covers/');
};

const applyCountryCover = (list, coverImage) => {
  const fallback = coverImage || '/assets/images/covers/kenya.jpg';
  return (list || []).map((item) => ({
    ...item,
    image: hasUsableImage(item.image) ? item.image : fallback
  }));
};

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
  const list = matched.length ? matched : anonymous;

  return list.map((item) => ({
    ...item,
    id: item.id || item._id
  }));
};

Page({
  data: {
    currentCountry: "",
    list: [],
    fullList: [],
    tags: ["全部"],
    activeTag: "全部",
    searchKeyword: "",
    noData: false
  },

  onLoad: function() {
    const selected = getSelectedDestination();
    this.loadAttractions(selected.zhName);
  },

  onShow: function() {
    const selected = getSelectedDestination();
    if (selected.zhName !== this.data.currentCountry || !this.data.list.length) {
      this.loadAttractions(selected.zhName);
    }
  },

  async loadAttractions(countryZh) {
    const selected = getSelectedDestination();
    const coverImage = selected.image;
    const localFallback = applyCountryCover(pickCountryList(attrLib.attractions, countryZh), coverImage);
    const docs = await loadCollectionWithFallback('attractions', localFallback, countryZh);
    const cloudList = applyCountryCover(pickCloudCountryList(docs, countryZh), coverImage);
    let nextList = cloudList.length ? cloudList : localFallback;
    try {
      nextList = await decorateBookmarks(nextList, 'attraction');
    } catch (error) {
      console.warn('attractions: load bookmarks failed', error);
    }
    const tags = ['全部', ...new Set(nextList.flatMap((item) => Array.isArray(item.tags) ? item.tags : []))];
    this.setData({
      currentCountry: countryZh,
      list: nextList,
      fullList: nextList,
      tags,
      activeTag: '全部',
      searchKeyword: '',
      noData: !nextList.length
    });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value || '' }, () => this.applyFilters());
  },

  onTagTap(e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag || '全部' }, () => this.applyFilters());
  },

  applyFilters() {
    const keyword = String(this.data.searchKeyword || '').trim().toLowerCase();
    const activeTag = this.data.activeTag;
    const list = this.data.fullList.filter((item) => {
      const matchesTag = activeTag === '全部' || (Array.isArray(item.tags) && item.tags.includes(activeTag));
      const searchable = [item.name, item.desc, item.tips, ...(item.tags || [])].filter(Boolean).join(' ').toLowerCase();
      return matchesTag && (!keyword || searchable.includes(keyword));
    });
    this.setData({ list });
  },

  async onBookmarkTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.list.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    try {
      const state = await toggleBookmark('attraction', item, {
        title: item.name,
        category: '景点攻略',
        payload: { image: item.image, desc: item.desc }
      });
      this.setData({
        list: this.data.list.map((entry) => String(entry.id) === String(id) ? { ...entry, ...state } : entry)
      });
      wx.showToast({ title: state.isBookmarked ? '已收藏' : '已取消收藏', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '收藏失败', icon: 'none' });
    }
  },

  onBackTap: function() {
    wx.navigateBack();
  },

  onAttrTap: function(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.fullList.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    wx.showModal({
      title: item.name || '景点详情',
      content: [item.desc, item.tips ? `出行提示：${item.tips}` : ''].filter(Boolean).join('\n\n'),
      showCancel: false
    });
  }
});
