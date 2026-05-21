// 01/pages/attractions/attractions.js
import { getCloudDatabase } from '../../utils/cloud-service.js';

const attrLib = require('../../data/attractions.js');

const DEFAULT_COUNTRY = '刚果(金)';

const buildFallbackAttractions = (countryZh) => ([
  {
    id: 'fallback-1',
    name: `${countryZh}景点示例`,
    image: '/assets/images/congo-drc.png',
    tags: ['示例组件', '待同步'],
    desc: '当前目的地还没有同步景点数据，先展示一个完整的卡片组件，避免页面空白。',
    tips: '后续接入云端后，这里会自动切换为真实景点列表。'
  },
  {
    id: 'fallback-2',
    name: '行程亮点占位卡',
    image: '/assets/images/congo-drc.png',
    tags: ['卡片布局', '前端适配'],
    desc: '即使没有后端数据，也会先把封面图、标签和说明文字渲染出来。',
    tips: '建议将云端景点字段补齐后再替换此内容。'
  }
]);

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
    list: [],
    tags: ["全部", "自然", "人文", "探险"]
  },

  onLoad: function() {
    const selected = wx.getStorageSync('selectedDestination') || { zhName: "刚果金" };
    this.loadAttractions(selected.zhName);
  },

  onShow: function() {
    const selected = wx.getStorageSync('selectedDestination') || { zhName: "刚果金" };
    if (selected.zhName !== this.data.currentCountry || !this.data.list.length) {
      this.loadAttractions(selected.zhName);
    }
  },

  async loadAttractions(countryZh) {
    const localFallback = pickCountryList(attrLib.attractions, countryZh);
    const placeholderFallback = buildFallbackAttractions(countryZh);
    const db = getCloudDatabase();

    try {
      if (!db) {
        this.setData({
          currentCountry: countryZh,
          list: localFallback.length ? localFallback : placeholderFallback
        });
        return;
      }

      const result = await db.collection('attractions').get();
      const cloudList = pickCloudCountryList(result.data, countryZh);

      this.setData({
        currentCountry: countryZh,
        list: cloudList.length ? cloudList : (localFallback.length ? localFallback : placeholderFallback)
      });
    } catch (error) {
      console.error('attractions: load failed', error);
      this.setData({
        currentCountry: countryZh,
        list: localFallback.length ? localFallback : placeholderFallback
      });
    }
  },

  onBackTap: function() {
    wx.navigateBack();
  },

  onAttrTap: function(e) {
    const name = e.currentTarget.dataset.name;
    // 以后可以跳转到详情页
    wx.showToast({ title: '查看' + name + '详情', icon: 'none' });
  }
});