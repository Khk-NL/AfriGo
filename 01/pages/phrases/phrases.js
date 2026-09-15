import { loadGuide } from '../../utils/cloud-service.js';

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
    const list = (phraseLib.phrases && phraseLib.phrases[countryName]) ? phraseLib.phrases[countryName] : buildFallbackPhrases(countryName);

    this.setData({
      currentCountry: countryName,
      fullList: list,
      displayList: list
    });

    try {
      const guide = await loadGuide(countryName);
      if (guide && Array.isArray(guide.phrasesList) && guide.phrasesList.length) {
        this.setData({
          fullList: guide.phrasesList,
          displayList: guide.phrasesList
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
  }
});