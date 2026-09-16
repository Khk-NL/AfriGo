import { getSelectedDestination } from '../../utils/countries.js';
import { getStoredCurrentUser, loadGuide, translateText } from '../../utils/cloud-service.js';

const LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' }
];

Page({
  data: {
    countryCode: 'KE',
    countryZh: '肯尼亚',
    destination: null,
    security: null,
    offlineUpdatedAt: '',
    offlineStatus: '尚未保存离线包',
    languages: LANGUAGES,
    sourceIndex: 0,
    targetIndex: 1,
    sourceText: '',
    translatedText: '',
    translating: false
  },

  async onLoad() {
    const destination = getSelectedDestination();
    const place = wx.getStorageSync(`travelToolPlace:${destination.code}`) || null;
    const offline = wx.getStorageSync(`offlineLandingPack:${destination.code}`) || null;
    this.setData({
      countryCode: destination.code,
      countryZh: destination.zhName,
      destination: place,
      offlineUpdatedAt: offline && offline.updatedAt ? offline.updatedAt : '',
      offlineStatus: offline ? '离线包已就绪' : '尚未保存离线包'
    });
    try {
      const guide = await loadGuide(destination.zhName);
      this.setData({ security: guide && guide.security ? guide.security : null });
    } catch (error) {
      if (offline && offline.guide) this.setData({ security: offline.guide.security || null });
    }
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (place) => {
        const destination = { name: place.name || place.address || '已选位置', address: place.address || '', latitude: place.latitude, longitude: place.longitude };
        wx.setStorageSync(`travelToolPlace:${this.data.countryCode}`, destination);
        this.setData({ destination });
      },
      fail: (error) => {
        if (!String(error.errMsg || '').includes('cancel')) wx.showToast({ title: '无法选择位置，请检查定位权限', icon: 'none' });
      }
    });
  },

  onOpenLocation() {
    const place = this.data.destination;
    if (!place || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) {
      wx.showToast({ title: '请先选择目的地', icon: 'none' });
      return;
    }
    wx.openLocation({ latitude: Number(place.latitude), longitude: Number(place.longitude), name: place.name, address: place.address, scale: 16 });
  },

  onShowCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (location) => wx.openLocation({ latitude: location.latitude, longitude: location.longitude, name: '我的位置', scale: 16 }),
      fail: () => wx.showToast({ title: '无法获取当前位置', icon: 'none' })
    });
  },

  async onSaveOfflinePack() {
    wx.showLoading({ title: '正在整理离线包' });
    try {
      const guide = await loadGuide(this.data.countryZh);
      const plans = wx.getStorageSync('landingAssistantTripPlans') || {};
      const updatedAt = new Date().toISOString();
      wx.setStorageSync(`offlineLandingPack:${this.data.countryCode}`, {
        version: 1,
        countryCode: this.data.countryCode,
        countryZh: this.data.countryZh,
        updatedAt,
        guide,
        trip: plans[this.data.countryCode] || null
      });
      this.setData({ offlineUpdatedAt: updatedAt, offlineStatus: '离线包已就绪', security: guide.security || this.data.security });
      wx.showToast({ title: '离线包已更新', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '当前国家暂无可保存资料', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onLanguageChange(e) {
    this.setData({ [e.currentTarget.dataset.field]: Number(e.detail.value) });
  },

  onSourceInput(e) {
    this.setData({ sourceText: e.detail.value || '' });
  },

  async onTranslateTap() {
    const sourceText = String(this.data.sourceText || '').trim();
    if (!sourceText) {
      wx.showToast({ title: '请输入要翻译的内容', icon: 'none' });
      return;
    }
    if (!getStoredCurrentUser()) {
      wx.showToast({ title: '翻译服务需登录后使用', icon: 'none' });
      return;
    }
    this.setData({ translating: true });
    try {
      const result = await translateText({
        text: sourceText,
        sourceLanguage: this.data.languages[this.data.sourceIndex].code,
        targetLanguage: this.data.languages[this.data.targetIndex].code
      });
      this.setData({ translatedText: result.translated || '' });
    } catch (error) {
      wx.showToast({ title: error.message || '翻译失败', icon: 'none' });
    } finally {
      this.setData({ translating: false });
    }
  },

  onCopyTranslation() {
    if (this.data.translatedText) wx.setClipboardData({ data: this.data.translatedText });
  },

  onOpenPhrases() {
    wx.navigateTo({ url: '/pages/phrases/phrases' });
  },

  onCall(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },

  onGoBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/home/home' }) });
  }
});
