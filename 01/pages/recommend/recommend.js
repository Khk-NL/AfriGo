// 01/pages/recommend/recommend.js
import { getCloudDatabase } from '../../utils/cloud-service.js';

const recLib = require('../../data/recommend.js');

const DEFAULT_COUNTRY = '刚果(金)';

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

  if (!candidates.includes(DEFAULT_COUNTRY)) {
    candidates.push(DEFAULT_COUNTRY);
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
    categories: ["全部", "美食", "住宿", "交通", "购物"],
    activeCategory: "全部",
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
    const db = getCloudDatabase();

    try {
      if (!db) {
        this.setData({
          currentCountry: countryZh,
          displayList: localFallback,
          fullList: localFallback,
          summaryCount: localFallback.length
        });
        return;
      }

      const result = await db.collection('recommend').get();
      const cloudList = pickCloudCountryList(result.data, countryZh);
      const nextList = cloudList.length ? cloudList : localFallback;

      this.setData({
        currentCountry: countryZh,
        displayList: nextList,
        fullList: nextList,
        summaryCount: nextList.length
      });
    } catch (error) {
      console.error('recommend: load failed', error);
      this.setData({
        currentCountry: countryZh,
        displayList: localFallback,
        fullList: localFallback,
        summaryCount: localFallback.length
      });
    }
  },

  onTagTap: function(e) {
    const category = e.currentTarget.dataset.tag;
    let filtered = this.data.fullList;
    if (category !== "全部") {
      filtered = this.data.fullList.filter(item => item.category === category);
    }
    this.setData({ activeCategory: category, displayList: filtered });
  },

  onBackTap: function() {
    wx.navigateBack();
  }
});