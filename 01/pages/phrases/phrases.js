import { loadGuide } from '../../utils/cloud-service.js';
import { decorateBookmarks, toggleBookmark } from '../../utils/bookmarks.js';

const phraseLib = require('../../data/phrases.js');

const buildFallbackPhrases = (countryName) => ([
  {
    id: 'fallback-1',
    type: '示例',
    cn: `${countryName}暂无同步语句`,
    foreign: 'No synced phrase yet',
    konger: '展示用占位内容',
    audio: ''
  },
  {
    id: 'fallback-2',
    type: '示例',
    cn: '请在云端配置实用语句',
    foreign: 'Please configure phrases in cloud data',
    konger: '后续自动替换',
    audio: ''
  },
  {
    id: 'fallback-3',
    type: '示例',
    cn: '这里会显示同样的卡片组件',
    foreign: 'The same card component will render here',
    konger: 'UI 先行展示',
    audio: ''
  }
]);

Page({
  data: {
    currentCountry: "",
    fullList: [],      // 存储当前国家的原始数组
    displayList: [],   // 存储搜索/过滤后的展示数组
    categories: ["全部", "日常", "应急", "医疗"],
    activeCategory: "全部",
    searchKey: ""
  },

  onLoad: async function() {
    const cached = wx.getStorageSync('selectedDestination') || { zhName: "肯尼亚" };
    const countryName = cached.zhName;
    let list = (phraseLib.phrases && phraseLib.phrases[countryName]) ? phraseLib.phrases[countryName] : buildFallbackPhrases(countryName);

    try {
      list = await decorateBookmarks(list, 'phrase');
    } catch (error) {
      console.warn('phrases: load bookmarks failed', error);
    }

    this.setData({
      currentCountry: countryName,
      fullList: list,
      displayList: list
    });

    try {
      const guide = await loadGuide(countryName);
      if (guide && Array.isArray(guide.phrasesList) && guide.phrasesList.length) {
        const phrasesList = await decorateBookmarks(guide.phrasesList, 'phrase');
        this.setData({
          fullList: phrasesList,
          displayList: phrasesList
        });
      }
    } catch (error) {
      console.warn('phrases: fallback to local', error);
    }
  },

  // 搜索框输入监听
  onSearchInput: function(e) {
    const key = e.detail.value.toLowerCase();
    this.setData({ searchKey: key });
    this.applyFilter();
  },

  // 清除搜索词
  onClearSearch: function() {
    this.setData({ searchKey: "" });
    this.applyFilter();
  },

  // 分类标签点击
  onTagTap: function(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({ activeCategory: tag });
    this.applyFilter();
  },

  // 🔍 核心过滤逻辑：联动分类和搜索词
  applyFilter: function() {
    const { fullList, activeCategory, searchKey } = this.data;

    // 逻辑：先滤分类，再滤关键词
    const filtered = fullList.filter(item => {
      // 1. 检查分类 (全匹配)
      const matchCat = (activeCategory === "全部" || item.type === activeCategory);

      // 2. 检查搜索词 (多字段模糊匹配)
      const matchKey = !searchKey ||
          (item.cn && item.cn.toLowerCase().includes(searchKey)) ||
          (item.foreign && item.foreign.toLowerCase().includes(searchKey)) ||
          (item.konger && item.konger.toLowerCase().includes(searchKey));

      return matchCat && matchKey;
    });

    this.setData({ displayList: filtered });
  },

  onBackTap: function() {
    wx.navigateBack();
  },

  onPlayAudio: function() {
    wx.showToast({ title: '语音播放中...', icon: 'none' });
  },

  async onBookmarkTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.fullList.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    try {
      const state = await toggleBookmark('phrase', item, {
        title: item.cn || item.foreign,
        category: item.type || '实用语句',
        payload: { cn: item.cn, foreign: item.foreign, konger: item.konger }
      });
      const fullList = this.data.fullList.map((entry) => String(entry.id) === String(id) ? { ...entry, ...state } : entry);
      const displayList = fullList.filter((entry) => {
        const matchCat = this.data.activeCategory === '全部' || entry.type === this.data.activeCategory;
        const searchKey = this.data.searchKey;
        const matchKey = !searchKey ||
          (entry.cn && entry.cn.toLowerCase().includes(searchKey)) ||
          (entry.foreign && entry.foreign.toLowerCase().includes(searchKey)) ||
          (entry.konger && entry.konger.toLowerCase().includes(searchKey));
        return matchCat && matchKey;
      });
      this.setData({ fullList, displayList });
      wx.showToast({ title: state.isBookmarked ? '已收藏' : '已取消收藏', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '收藏失败', icon: 'none' });
    }
  }
});
