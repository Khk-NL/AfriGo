import { getSelectedDestination } from '../../utils/countries.js';
import {
  getStoredCurrentUser,
  loadGuide,
  loadMyContentCorrections,
  loadRiskAlerts,
  submitContentCorrection
} from '../../utils/cloud-service.js';

const CONTENT_TYPES = [
  { key: 'guide', label: '国家指南' },
  { key: 'security', label: '安全与应急' },
  { key: 'visa', label: '签证入境' },
  { key: 'health', label: '健康医疗' },
  { key: 'customs', label: '风俗禁忌' },
  { key: 'phrases', label: '常用语' },
  { key: 'attraction', label: '景点' },
  { key: 'recommend', label: '出行推荐' },
  { key: 'service', label: '服务方资料' }
];

const STATUS_LABELS = { pending: '待审核', accepted: '已采纳', rejected: '未采纳' };

function extractUrls(values) {
  const matches = (Array.isArray(values) ? values : [values]).flatMap((value) => String(value || '').match(/https?:\/\/[^\s，。；、)）]+/g) || []);
  return [...new Set(matches)];
}

function dateLabel(value) {
  return value ? String(value).slice(0, 10) : '暂无核验时间';
}

Page({
  data: {
    countryCode: 'KE',
    countryZh: '肯尼亚',
    source: { label: '本地初始资料', updatedLabel: '暂无核验时间', freshnessLabel: '需联网核验', urls: [] },
    alerts: [],
    contentTypes: CONTENT_TYPES,
    contentTypeIndex: 0,
    correction: { title: '', description: '', sourceUrl: '' },
    corrections: [],
    isLoggedIn: false,
    submitting: false
  },

  async onLoad() {
    const destination = getSelectedDestination();
    const isLoggedIn = !!getStoredCurrentUser();
    this.setData({ countryCode: destination.code, countryZh: destination.zhName, isLoggedIn });
    await Promise.all([this.loadSource(), this.loadAlerts()]);
    if (isLoggedIn) await this.loadCorrections();
  },

  async loadSource() {
    try {
      const guide = await loadGuide(this.data.countryZh);
      const raw = guide && guide.source ? guide.source : {};
      const updatedAt = raw.verifiedAt || raw.updatedAt;
      const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Number.POSITIVE_INFINITY;
      const freshnessLabel = ageMs <= 180 * 24 * 60 * 60 * 1000 ? '近 180 天内同步' : '超过 180 天，建议复核';
      this.setData({
        source: {
          label: raw.label || '项目本地初始资料',
          trustLabel: raw.trustLevel === 'curated' ? '项目整合资料' : '本地缓存资料',
          updatedLabel: dateLabel(updatedAt),
          freshnessLabel,
          urls: extractUrls(raw.urls)
        }
      });
    } catch (error) {
      console.error('content trust: load guide failed', error);
    }
  },

  async loadAlerts() {
    try {
      const alerts = (await loadRiskAlerts(this.data.countryCode)).map((item) => ({
        ...item,
        publishedLabel: dateLabel(item.publishedAt),
        verifiedLabel: dateLabel(item.verifiedAt),
        expiresLabel: item.expiresAt ? dateLabel(item.expiresAt) : '长期有效，仍需出发前复核'
      }));
      this.setData({ alerts });
    } catch (error) {
      this.setData({ alerts: [] });
    }
  },

  async loadCorrections() {
    try {
      const corrections = (await loadMyContentCorrections()).map((item) => ({
        ...item,
        statusLabel: STATUS_LABELS[item.status] || item.status
      }));
      this.setData({ corrections });
    } catch (error) {
      console.error('content trust: load corrections failed', error);
    }
  },

  onTypeChange(e) {
    this.setData({ contentTypeIndex: Number(e.detail.value) });
  },

  onCorrectionInput(e) {
    this.setData({ [`correction.${e.currentTarget.dataset.field}`]: e.detail.value || '' });
  },

  async onSubmitCorrection() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '登录后可提交纠错并查看审核进度', icon: 'none' });
      return;
    }
    const { title, description, sourceUrl } = this.data.correction;
    if (!title.trim() || !description.trim()) {
      wx.showToast({ title: '请填写问题标题和纠错说明', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await submitContentCorrection({
        countryCode: this.data.countryCode,
        countryZh: this.data.countryZh,
        contentType: CONTENT_TYPES[this.data.contentTypeIndex].key,
        title,
        description,
        sourceUrl
      });
      this.setData({ correction: { title: '', description: '', sourceUrl: '' } });
      await this.loadCorrections();
      wx.showToast({ title: '纠错已提交审核', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onCopyUrl(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.setClipboardData({ data: url });
  },

  onGoBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/home/home' }) });
  }
});
