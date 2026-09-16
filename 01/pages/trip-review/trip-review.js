import { getSelectedDestination } from '../../utils/countries.js';
import {
  addTripExpense,
  cloneTrip,
  createPost,
  deleteTripExpense,
  getStoredCurrentUser,
  loadTripExpenses,
  loadTripReview,
  loadTrips,
  saveTripReview
} from '../../utils/cloud-service.js';

const CATEGORIES = [
  { key: 'transport', label: '交通' },
  { key: 'accommodation', label: '住宿' },
  { key: 'food', label: '餐饮' },
  { key: 'activities', label: '活动' },
  { key: 'insurance', label: '保险' },
  { key: 'other', label: '其他' }
];

Page({
  data: {
    countryZh: '肯尼亚',
    trip: null,
    loginRequired: false,
    emptyTrip: false,
    loading: true,
    categories: CATEGORIES,
    categoryIndex: 0,
    expense: { amount: '', note: '', spentOn: '' },
    expenses: [],
    plannedTotal: '0.00',
    actualTotal: '0.00',
    balanceLabel: '0.00',
    categoryTotals: [],
    review: { rating: 5, summary: '', highlights: '', lessons: '' },
    savingExpense: false,
    savingReview: false,
    cloning: false,
    publishing: false
  },

  async onLoad(options = {}) {
    const destination = getSelectedDestination();
    this.setData({ countryZh: destination.zhName });
    if (!getStoredCurrentUser()) {
      this.setData({ loading: false, loginRequired: true });
      return;
    }
    try {
      const trips = await loadTrips();
      const trip = options.tripId
        ? trips.find((item) => String(item.id) === String(options.tripId))
        : trips.find((item) => item.countryCode === destination.code);
      if (!trip) {
        this.setData({ loading: false, emptyTrip: true });
        return;
      }
      this.setData({ trip, countryZh: trip.countryZh || destination.zhName });
      await this.refreshData();
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '复盘加载失败', icon: 'none' });
    }
  },

  async refreshData() {
    const { trip } = this.data;
    const [expenses, review] = await Promise.all([loadTripExpenses(trip.id), loadTripReview(trip.id)]);
    this.setData({
      expenses,
      review: review || { rating: 5, summary: '', highlights: '', lessons: '' },
      loading: false
    }, () => this.refreshSummary());
  },

  refreshSummary() {
    const budget = this.data.trip && this.data.trip.budget ? this.data.trip.budget : {};
    const planned = CATEGORIES.reduce((sum, item) => sum + (Number(budget[item.key]) || 0), 0);
    const totals = Object.fromEntries(CATEGORIES.map((item) => [item.key, 0]));
    (this.data.expenses || []).forEach((item) => { totals[item.category] = (totals[item.category] || 0) + Number(item.amount || 0); });
    const actual = Object.values(totals).reduce((sum, value) => sum + value, 0);
    this.setData({
      plannedTotal: planned.toFixed(2),
      actualTotal: actual.toFixed(2),
      balanceLabel: `${actual > planned ? '超支' : '结余'} ${Math.abs(planned - actual).toFixed(2)}`,
      categoryTotals: CATEGORIES.map((item) => ({ ...item, amount: totals[item.key].toFixed(2) }))
    });
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) });
  },

  onExpenseInput(e) {
    this.setData({ [`expense.${e.currentTarget.dataset.field}`]: e.detail.value || '' });
  },

  onExpenseDateChange(e) {
    this.setData({ 'expense.spentOn': e.detail.value });
  },

  async onAddExpense() {
    const amount = Number(this.data.expense.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    this.setData({ savingExpense: true });
    try {
      await addTripExpense(this.data.trip.id, {
        ...this.data.expense,
        amount,
        category: CATEGORIES[this.data.categoryIndex].key,
        currency: this.data.trip.currency
      });
      this.setData({ expense: { amount: '', note: '', spentOn: '' } });
      const expenses = await loadTripExpenses(this.data.trip.id);
      this.setData({ expenses }, () => this.refreshSummary());
      wx.showToast({ title: '费用已记录', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '记录失败', icon: 'none' });
    } finally {
      this.setData({ savingExpense: false });
    }
  },

  onDeleteExpense(e) {
    const expenseId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除费用记录',
      content: '这条费用将从本次复盘中移除。',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await deleteTripExpense(this.data.trip.id, expenseId);
          const expenses = this.data.expenses.filter((item) => item.id !== expenseId);
          this.setData({ expenses }, () => this.refreshSummary());
        } catch (error) {
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    });
  },

  onRatingTap(e) {
    this.setData({ 'review.rating': Number(e.currentTarget.dataset.value) });
  },

  onReviewInput(e) {
    this.setData({ [`review.${e.currentTarget.dataset.field}`]: e.detail.value || '' });
  },

  async onSaveReview() {
    this.setData({ savingReview: true });
    try {
      const review = await saveTripReview(this.data.trip.id, this.data.review);
      this.setData({ review: { ...this.data.review, ...review } });
      wx.showToast({ title: '复盘已保存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingReview: false });
    }
  },

  async onCloneTrip() {
    this.setData({ cloning: true });
    try {
      const cloned = await cloneTrip(this.data.trip.id);
      const plans = wx.getStorageSync('landingAssistantTripPlans') || {};
      plans[cloned.countryCode] = cloned;
      wx.setStorageSync('landingAssistantTripPlans', plans);
      wx.showModal({
        title: '路线已复用',
        content: '已复制预算和逐日路线，并清空日期、签证进度和订单信息。',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/trip-plan/trip-plan' })
      });
    } catch (error) {
      wx.showToast({ title: error.message || '路线复用失败', icon: 'none' });
    } finally {
      this.setData({ cloning: false });
    }
  },

  async onPublishNote() {
    const review = this.data.review;
    if (!review.summary && !review.highlights && !review.lessons) {
      wx.showToast({ title: '请先填写复盘内容', icon: 'none' });
      return;
    }
    this.setData({ publishing: true });
    try {
      const parts = [
        `【${this.data.trip.name}】${review.rating} 星复盘`,
        review.summary,
        review.highlights ? `值得推荐：${review.highlights}` : '',
        review.lessons ? `经验提醒：${review.lessons}` : '',
        `实际支出：${this.data.trip.currency} ${this.data.actualTotal}`
      ].filter(Boolean);
      await createPost({
        content: parts.join('\n\n'),
        extra: { destinationLabel: this.data.trip.countryZh }
      });
      wx.showToast({ title: '游记已发布', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '发布失败', icon: 'none' });
    } finally {
      this.setData({ publishing: false });
    }
  },

  onOpenPlan() {
    wx.navigateTo({ url: '/pages/trip-plan/trip-plan' });
  },

  onGoBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/home/home' }) });
  }
});
