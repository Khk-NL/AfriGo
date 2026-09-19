// miniprogram/pages/labor/labor.js
import { loadGuide } from '../../utils/cloud-service.js';
import { getSelectedDestination } from '../../utils/countries.js';

const laborLib = require('../../data/labor.js');

const HOME_ROUTE = '/pages/home/home';

Page({
  data: {
    currentCountry: '',
    policyList: [],
    policyCount: 0
  },

  async onLoad() {
    const selected = getSelectedDestination();
    const countryZh = selected.zhName;
    const localList = laborLib.labor[countryZh] || [];
    this.setData({
      currentCountry: countryZh,
      policyList: localList,
      policyCount: localList.length
    });

    try {
      const guide = await loadGuide(countryZh);
      if (guide && Array.isArray(guide.laborList) && guide.laborList.length) {
        this.setData({
          policyList: guide.laborList,
          policyCount: guide.laborList.length
        });
      }
    } catch (error) {
      console.warn('labor: fallback to local', error);
    }
  },

  onPolicyTap(e) {
    const { title, content, tag, level } = e.currentTarget.dataset;

    wx.showModal({
      title: title || '合规提示',
      content: [tag ? `分类：${tag}` : '', level ? `重要性：${level}` : '', content || '', '详细条文请结合当地最新法规与专业意见判断。']
        .filter(Boolean)
        .join('\n\n'),
      showCancel: false
    });
  },

  onGoHomeTap() {
    wx.reLaunch({
      url: HOME_ROUTE
    });
  }
});
