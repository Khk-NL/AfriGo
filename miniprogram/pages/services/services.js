import { getSelectedDestination } from '../../utils/countries.js';
import { getStoredCurrentUser, loadMyServiceLeads, loadServices, submitServiceLead } from '../../utils/cloud-service.js';

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'hotel', label: '酒店' },
  { key: 'transport', label: '当地交通' },
  { key: 'guide', label: '导游' },
  { key: 'insurance', label: '保险' }
];

const STATUS_LABELS = { new: '待联系', contacted: '已联系', closed: '已完成', rejected: '未受理' };

Page({
  data: {
    countryCode: 'KE',
    countryZh: '肯尼亚',
    categories: CATEGORIES,
    activeCategory: '',
    providers: [],
    loading: true,
    selectedProvider: null,
    lead: { contactName: '', contactValue: '', requestText: '' },
    submitting: false,
    leads: [],
    isLoggedIn: false
  },

  async onLoad() {
    const destination = getSelectedDestination();
    const currentUser = getStoredCurrentUser();
    this.setData({
      countryCode: destination.code,
      countryZh: destination.zhName,
      isLoggedIn: !!currentUser,
      'lead.contactName': currentUser && currentUser.nickName ? currentUser.nickName : ''
    });
    await this.refreshServices();
    if (currentUser) await this.refreshLeads();
  },

  async refreshServices() {
    this.setData({ loading: true });
    try {
      const providers = await loadServices(this.data.countryCode, this.data.activeCategory);
      this.setData({ providers });
    } catch (error) {
      wx.showToast({ title: error.message || '服务目录加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async refreshLeads() {
    try {
      const leads = (await loadMyServiceLeads()).map((item) => ({
        ...item,
        statusLabel: STATUS_LABELS[item.status] || item.status
      }));
      this.setData({ leads });
    } catch (error) {
      console.error('services: load leads failed', error);
    }
  },

  onCategoryTap(e) {
    const activeCategory = e.currentTarget.dataset.key || '';
    if (activeCategory === this.data.activeCategory) return;
    this.setData({ activeCategory, selectedProvider: null }, () => this.refreshServices());
  },

  onSelectProvider(e) {
    const provider = this.data.providers.find((item) => item.id === String(e.currentTarget.dataset.id));
    if (!provider) return;
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '登录后才能提交服务意向', icon: 'none' });
      return;
    }
    this.setData({ selectedProvider: provider });
  },

  onLeadInput(e) {
    this.setData({ [`lead.${e.currentTarget.dataset.field}`]: e.detail.value || '' });
  },

  onCancelLead() {
    this.setData({ selectedProvider: null });
  },

  async onSubmitLead() {
    const { selectedProvider, lead } = this.data;
    if (!lead.contactName.trim() || !lead.contactValue.trim() || !lead.requestText.trim()) {
      wx.showToast({ title: '请完整填写联系与需求信息', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await submitServiceLead({ providerId: selectedProvider.id, ...lead });
      this.setData({ selectedProvider: null, lead: { ...lead, requestText: '' } });
      await this.refreshLeads();
      wx.showModal({
        title: '意向已提交',
        content: '这不是付款或预订凭证。服务方与平台仍需确认价格、资质、条款和售后安排。',
        showCancel: false
      });
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onCopySource(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.setClipboardData({ data: url });
  },

  onGoBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/home/home' }) });
  }
});
