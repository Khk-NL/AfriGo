import { getSelectedDestination } from '../../utils/countries.js';
import { getStoredCurrentUser, loadTrips, saveTrip } from '../../utils/cloud-service.js';

const STORAGE_KEY = 'landingAssistantTripPlans';
const PURPOSE_OPTIONS = [
  { key: 'travel', label: '旅行' },
  { key: 'work', label: '务工' },
  { key: 'business', label: '商务' }
];
const VISA_STAGES = [
  { key: 'not_started', label: '未开始' },
  { key: 'preparing', label: '准备材料' },
  { key: 'submitted', label: '已递交' },
  { key: 'approved', label: '已出签' }
];
const BUDGET_FIELDS = [
  { key: 'transport', label: '交通' },
  { key: 'accommodation', label: '住宿' },
  { key: 'food', label: '餐饮' },
  { key: 'activities', label: '活动' },
  { key: 'insurance', label: '保险' },
  { key: 'other', label: '其他' }
];

function checklistForPurpose(purpose, current = []) {
  const existing = Object.fromEntries((current || []).map((item) => [item.id, item.done]));
  const items = [
    ['passport', '护照有效期与空白页已核对'],
    ['visa', '签证/入境许可材料已准备'],
    ['vaccine', '疫苗与黄皮书要求已核对'],
    ['insurance', '境外医疗与意外保险已确认'],
    ['flight', '机票与入境行程单已保存'],
    ['hotel', '住宿订单与地址已离线保存']
  ];
  if (purpose === 'work') {
    items.push(['contract', '劳动合同、工作许可与雇主资料已核对']);
  }
  if (purpose === 'business') {
    items.push(['invitation', '邀请函、公司资质与商务联系人已核对']);
  }
  return items.map(([id, title]) => ({ id, title, done: !!existing[id] }));
}

function emptyBudget() {
  return Object.fromEntries(BUDGET_FIELDS.map((item) => [item.key, 0]));
}

function loadLocalPlans() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (error) {
    return {};
  }
}

function storeLocalPlan(plan) {
  const plans = loadLocalPlans();
  plans[plan.countryCode] = plan;
  wx.setStorageSync(STORAGE_KEY, plans);
}

Page({
  data: {
    id: '',
    countryCode: 'KE',
    countryZh: '肯尼亚',
    name: '',
    purpose: 'travel',
    purposeOptions: PURPOSE_OPTIONS,
    startDate: '',
    endDate: '',
    travelers: 1,
    currency: 'CNY',
    budgetFields: BUDGET_FIELDS,
    budget: emptyBudget(),
    budgetTotal: '0.00',
    visaStages: VISA_STAGES,
    visa: { stage: 'not_started', note: '' },
    checklist: checklistForPurpose('travel'),
    checklistDone: 0,
    checklistProgress: 0,
    itineraryText: '',
    bookings: { flight: '', hotel: '', localTransport: '' },
    syncLabel: '本机保存',
    saving: false
  },

  async onLoad() {
    const destination = getSelectedDestination();
    const localPlan = loadLocalPlans()[destination.code];
    this.applyPlan(localPlan || {
      countryCode: destination.code,
      countryZh: destination.zhName,
      name: `${destination.zhName}安全落地计划`
    });
    if (!getStoredCurrentUser()) return;
    try {
      const trips = await loadTrips();
      const remotePlan = trips.find((item) => item.countryCode === destination.code);
      if (remotePlan) {
        this.applyPlan(remotePlan);
        storeLocalPlan(remotePlan);
        this.setData({ syncLabel: '已与云端同步' });
      } else {
        this.setData({ syncLabel: '待首次云端同步' });
      }
    } catch (error) {
      this.setData({ syncLabel: '离线模式' });
    }
  },

  applyPlan(plan) {
    const purpose = plan.purpose || 'travel';
    const budget = { ...emptyBudget(), ...(plan.budget || {}) };
    const checklist = Array.isArray(plan.checklist) && plan.checklist.length
      ? checklistForPurpose(purpose, plan.checklist)
      : checklistForPurpose(purpose);
    this.setData({
      id: plan.id || '',
      countryCode: plan.countryCode || this.data.countryCode,
      countryZh: plan.countryZh || this.data.countryZh,
      name: plan.name || `${plan.countryZh || this.data.countryZh}安全落地计划`,
      purpose,
      startDate: plan.startDate || '',
      endDate: plan.endDate || '',
      travelers: plan.travelers || 1,
      currency: plan.currency || 'CNY',
      budget,
      visa: { stage: 'not_started', note: '', ...(plan.visa || {}) },
      checklist,
      itineraryText: plan.itineraryText || '',
      bookings: { flight: '', hotel: '', localTransport: '', ...(plan.bookings || {}) }
    }, () => this.refreshSummary());
  },

  refreshSummary() {
    const values = BUDGET_FIELDS.map((field) => Number(this.data.budget[field.key]) || 0);
    const checklist = this.data.checklist || [];
    const checklistDone = checklist.filter((item) => item.done).length;
    this.setData({
      budgetTotal: values.reduce((sum, value) => sum + value, 0).toFixed(2),
      checklistDone,
      checklistProgress: checklist.length ? Math.round(checklistDone / checklist.length * 100) : 0
    });
  },

  onPurposeTap(e) {
    const purpose = e.currentTarget.dataset.key;
    this.setData({ purpose, checklist: checklistForPurpose(purpose, this.data.checklist) }, () => this.refreshSummary());
  },

  onVisaStageTap(e) {
    this.setData({ 'visa.stage': e.currentTarget.dataset.key });
  },

  onDateChange(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onFieldInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onBudgetInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`budget.${key}`]: e.detail.value }, () => this.refreshSummary());
  },

  onChecklistTap(e) {
    const id = e.currentTarget.dataset.id;
    const checklist = this.data.checklist.map((item) => item.id === id ? { ...item, done: !item.done } : item);
    this.setData({ checklist }, () => this.refreshSummary());
  },

  buildPayload() {
    return {
      id: this.data.id,
      name: this.data.name,
      countryCode: this.data.countryCode,
      countryZh: this.data.countryZh,
      purpose: this.data.purpose,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      travelers: this.data.travelers,
      currency: this.data.currency,
      budget: this.data.budget,
      visa: this.data.visa,
      checklist: this.data.checklist,
      itineraryText: this.data.itineraryText,
      bookings: this.data.bookings
    };
  },

  async onSaveTap() {
    if (this.data.startDate && this.data.endDate && this.data.endDate < this.data.startDate) {
      wx.showToast({ title: '返程日期不能早于出发日期', icon: 'none' });
      return;
    }
    if (this.data.saving) return;
    this.setData({ saving: true });
    const payload = this.buildPayload();
    storeLocalPlan(payload);
    if (!getStoredCurrentUser()) {
      this.setData({ saving: false, syncLabel: '已保存到本机，登录后可云端同步' });
      wx.showToast({ title: '已本机保存', icon: 'success' });
      return;
    }
    try {
      const saved = await saveTrip(payload);
      this.applyPlan(saved);
      storeLocalPlan(saved);
      this.setData({ saving: false, syncLabel: '已与云端同步' });
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (error) {
      this.setData({ saving: false, syncLabel: '云端同步失败，已保存到本机' });
      wx.showToast({ title: error.message || '云端同步失败', icon: 'none' });
    }
  },

  onOpenReview() {
    const query = this.data.id ? `?tripId=${encodeURIComponent(this.data.id)}` : '';
    wx.navigateTo({ url: `/pages/trip-review/trip-review${query}` });
  },

  onGoBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/home/home' }) });
  }
});
