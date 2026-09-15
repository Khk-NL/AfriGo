// 01/pages/labor/labor.js
import { loadGuide } from '../../utils/cloud-service.js';

const laborLib = require('../../data/labor.js');

const HOME_ROUTE = '/pages/home/home';

const buildFallbackPolicies = (countryZh) => ([
  {
    id: 'fallback-1',
    title: `${countryZh}劳务合规示例`,
    content: '当前目的地暂未同步到本地数据，先展示一个标准合规卡片。后续接入云端后，这里会自动替换为真实条目。',
    tag: '示例组件',
    level: '待同步'
  },
  {
    id: 'fallback-2',
    title: '签证与雇佣关系核验',
    content: '请先确认签证类型、雇佣合同和入境要求，再开展劳务安排。',
    tag: '前置检查',
    level: '提示'
  },
  {
    id: 'fallback-3',
    title: '健康证明与保险',
    content: '建议保留健康证明、保险单据和紧急联系人信息，便于后续流程核验。',
    tag: '基础保障',
    level: '建议'
  }
]);

Page({
  data: {
    currentCountry: '',
    policyList: [],
    policyCount: 0
  },

  async onLoad() {
    const selected = wx.getStorageSync('selectedDestination') || { zhName: '刚果(金)' };
    const countryZh = selected.zhName;
    const localList = laborLib.labor[countryZh] || buildFallbackPolicies(countryZh);
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