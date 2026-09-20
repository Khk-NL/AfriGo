import { createPost, loadCollectionWithFallback, loadRiskAlerts } from '../../utils/cloud-service.js';
import { buildHomeText, getCountryName, getStoredLanguage, normalizeLanguage, setStoredLanguage } from '../../utils/i18n.js';
import { getSelectedDestination } from '../../utils/countries.js';
import { ICON_IMAGES } from '../../config/icons.js';

const { attractions: localAttractionsData } = require('../../data/attractions.js');
const { recommend: localRecommendData } = require('../../data/recommend.js');

const JOURNEY_TOOLS = [
  { key: 'map', icon: '🗺️', iconImage: ICON_IMAGES.journey.map, labels: { zh: '地图导航', en: 'Maps', fr: 'Carte' }, descriptions: { zh: '选点与定位', en: 'Pick and locate', fr: 'Choisir et localiser' } },
  { key: 'translate', icon: '🌐', iconImage: ICON_IMAGES.journey.translate, labels: { zh: '随身翻译', en: 'Translate', fr: 'Traduire' }, descriptions: { zh: '中文与当地语言', en: 'Travel phrases', fr: 'Phrases de voyage' } },
  { key: 'offline', icon: '📥', iconImage: ICON_IMAGES.journey.offline, labels: { zh: '离线安全包', en: 'Offline Pack', fr: 'Pack hors ligne' }, descriptions: { zh: '无网也能查', en: 'Works offline', fr: 'Disponible hors ligne' } },
  { key: 'emergency', icon: '🆘', iconImage: ICON_IMAGES.journey.emergency, labels: { zh: '紧急求助', en: 'Emergency', fr: 'Urgence' }, descriptions: { zh: '风险与应急号码', en: 'Alerts and contacts', fr: 'Alertes et contacts' } }
];

const HOME_SERVICES = [
  { key: 'review', icon: '🧾', iconImage: ICON_IMAGES.homeServices.review, title: '旅后复盘与路线复用', description: '费用、评价、游记和下次模板' },
  { key: 'services', icon: '🤝', iconImage: ICON_IMAGES.homeServices.services, title: '经审核的本地服务', description: '酒店、交通、导游与保险咨询' },
  { key: 'trust', icon: '🔎', iconImage: ICON_IMAGES.homeServices.trust, title: '信息来源、风险与纠错', description: '核验时间、有效期与审核进度' }
];

const SYNC_TEXT = {
  zh: { loading: '正在同步最新资料…', synced: (time) => `已同步 · 更新于 ${time} · 下拉可刷新`, refreshed: '已更新' },
  en: { loading: 'Syncing latest data…', synced: (time) => `Synced · updated ${time} · pull to refresh`, refreshed: 'Updated' },
  fr: { loading: 'Synchronisation…', synced: (time) => `Synchronisé · ${time} · tirez pour actualiser`, refreshed: 'Mis à jour' }
};

function buildJourneyTools(language) {
  return JOURNEY_TOOLS.map((item) => ({
    key: item.key,
    icon: item.icon,
    iconImage: item.iconImage,
    label: item.labels[language] || item.labels.zh,
    description: item.descriptions[language] || item.descriptions.zh
  }));
}

const getCountryCandidates = (countryZh) => {
  const candidates = [];
  const rawCountry = typeof countryZh === 'string' ? countryZh.trim() : '';

  if (rawCountry) {
    candidates.push(rawCountry);
  }

  const aliasCountry = rawCountry.replace(/[()]/g, '');
  if (aliasCountry && aliasCountry !== rawCountry) {
    candidates.push(aliasCountry);
  }

  return candidates;
};

const pickLocalCountryList = (sourceMap, countryZh) => {
  if (!sourceMap) {
    return [];
  }

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
  const withCountryField = docs.filter(item => {
    const docCountry = item.countryZh || item.country || item.destination || item.region || item.area;
    return docCountry && candidates.includes(docCountry);
  });

  const finalList = withCountryField.length
    ? withCountryField
    : docs.filter(item => !item.countryZh && !item.country && !item.destination && !item.region && !item.area);

  return finalList.map(item => ({
    ...item,
    id: item.id || item._id
  }));
};

Page({
  data: {
    language: getStoredLanguage(),
    currentCountryZh: '肯尼亚',
    activeTab: 'home',
    heroCoverImage: '/assets/images/covers/kenya.jpg',
    uiText: buildHomeText(getStoredLanguage(), '肯尼亚'),
    attractionsList: [],
    recommendList: [],
    tripPreview: { progress: 0, label: '开始制定行前计划' },
    loading: true,
    updatedAtLabel: '',
    syncText: SYNC_TEXT.zh.loading,
    riskBanner: null,
    refreshing: false,
    journeyTools: buildJourneyTools(getStoredLanguage()),
    homeServices: HOME_SERVICES
  },

  applyLanguage(language, countryZh = this.data.currentCountryZh) {
    const nextLanguage = normalizeLanguage(language);
    const destination = getSelectedDestination();
    this.setData({
      language: nextLanguage,
      currentCountryZh: countryZh,
      // 与欢迎页使用同一张国家封面，进入首页后视觉连续
      heroCoverImage: destination.image || this.data.heroCoverImage || '/assets/images/covers/kenya.jpg',
      uiText: buildHomeText(nextLanguage, countryZh),
      journeyTools: buildJourneyTools(nextLanguage)
    });
  },

  onLoad() {
    const language = getStoredLanguage();
    const cached = getSelectedDestination();
    const countryZh = cached.zhName;

    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#f8f9fa',
      animation: {
        duration: 200,
        timingFunc: 'easeIn'
      }
    });

    this.applyLanguage(language, countryZh);
    this.refreshHome();
  },

  onShow() {
    const cached = getSelectedDestination();
    const countryZh = cached.zhName;
    const language = getStoredLanguage();

    this.applyLanguage(language, countryZh);
    // 行程进度可能在别处被改过，每次回到首页都重新读一次
    this.loadTripPreview(cached.code);
    if (this._homeCollectionsCountry !== countryZh) {
      this.refreshHome();
    }
  },

  loadTripPreview(countryCode) {
    try {
      const plans = wx.getStorageSync('landingAssistantTripPlans') || {};
      const plan = plans[countryCode];
      if (!plan) {
        this.setData({ tripPreview: { progress: 0, label: '开始制定行前计划' } });
        return;
      }
      const checklist = Array.isArray(plan.checklist) ? plan.checklist : [];
      const done = checklist.filter((item) => item.done).length;
      const progress = checklist.length ? Math.round(done / checklist.length * 100) : 0;
      this.setData({ tripPreview: { progress, label: `${plan.name || '安全落地计划'} · ${progress}%` } });
    } catch (error) {
      this.setData({ tripPreview: { progress: 0, label: '开始制定行前计划' } });
    }
  },

  async loadCollectionData(collectionName, localSource, countryZh, targetKey) {
    const localFallback = pickLocalCountryList(localSource, countryZh);
    const docs = await loadCollectionWithFallback(collectionName, localFallback, countryZh);
    const cloudList = pickCloudCountryList(docs, countryZh);
    const nextList = cloudList.length ? cloudList : localFallback;
    this.setData({ [targetKey]: nextList });
    return nextList;
  },

  async loadHomeCollections(countryZh) {
    this._homeCollectionsCountry = countryZh;

    await this.loadCollectionData('attractions', localAttractionsData, countryZh, 'attractionsList');
    await this.loadCollectionData('recommend', localRecommendData, countryZh, 'recommendList');
  },

  /** 加载当前国家的有效风险提醒（公开接口，无需登录），让首页显示真实在更新的信息。 */
  async loadRiskBanner(countryCode) {
    if (!countryCode) {
      this.setData({ riskBanner: null });
      return;
    }
    try {
      const alerts = await loadRiskAlerts(countryCode);
      const first = Array.isArray(alerts) ? alerts[0] : null;
      this.setData({
        riskBanner: first ? {
          title: first.title,
          severity: first.severity,
          sourceName: first.sourceName || '',
          publishedAt: String(first.publishedAt || '').slice(0, 10)
        } : null
      });
    } catch (error) {
      // 风险提醒失败不影响首页其余内容
      this.setData({ riskBanner: null });
    }
  },

  /** 首页统一刷新：集合、行程预览、风险提醒一起更新，并记录本次同步时间。 */
  async refreshHome() {
    const cached = getSelectedDestination();
    const countryZh = cached.zhName;
    const sync = SYNC_TEXT[this.data.language] || SYNC_TEXT.zh;
    this.setData({ loading: true, syncText: sync.loading });
    try {
      await Promise.all([
        this.loadHomeCollections(countryZh),
        this.loadTripPreview(cached.code),
        this.loadRiskBanner(cached.code)
      ]);
      const clock = this.formatClock(new Date());
      this.setData({ updatedAtLabel: clock, syncText: sync.synced(clock) });
    } finally {
      this.setData({ loading: false });
    }
  },

  formatClock(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 页面内容在满屏 scroll-view 里，页面级下拉可能被抢手势，因此同时接 scroll-view 的 refresher
  async onRefresh() {
    this.setData({ refreshing: true });
    try {
      await this.onPullDownRefresh();
    } finally {
      this.setData({ refreshing: false });
    }
  },

  async onPullDownRefresh() {
    try {
      await this.refreshHome();
      const sync = SYNC_TEXT[this.data.language] || SYNC_TEXT.zh;
      wx.showToast({ title: sync.refreshed, icon: 'none' });
    } catch (error) {
      console.error('home: pull down refresh failed', error);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  async uploadPost(content) {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent) {
      throw new Error('帖子内容不能为空');
    }

    return createPost({ content: trimmedContent });
  },

  onMoreTap() {
    this.onOpenSecurityGuide();
  },

  onOpenSecurityGuide() {
    wx.navigateTo({
      url: '/pages/security/security'
    });
  },

  onTripPlanTap() {
    wx.navigateTo({ url: '/pages/trip-plan/trip-plan' });
  },

  onJourneyToolTap(e) {
    const section = e.currentTarget.dataset.section || 'all';
    wx.navigateTo({ url: `/pages/travel-tools/travel-tools?section=${encodeURIComponent(section)}` });
  },

  onHomeServiceTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'review') return this.onTripReviewTap();
    if (key === 'services') return this.onServicesTap();
    if (key === 'trust') return this.onContentTrustTap();
  },

  onTripReviewTap() {
    wx.navigateTo({ url: '/pages/trip-review/trip-review' });
  },

  onServicesTap() {
    wx.navigateTo({ url: '/pages/services/services' });
  },

  onContentTrustTap() {
    wx.navigateTo({ url: '/pages/content-trust/content-trust' });
  },

  onFeatureTap(e) {
    const { key, name, themeStart, themeEnd } = e.currentTarget.dataset;

    const featureRouteMap = {
      visa: '/pages/logs/logs',
      'local-info': '/pages/local-info/local-info',
      localInfo: '/pages/local-info/local-info',
      health: '/pages/home/health',
      customs: '/pages/customs/customs',
      labor: '/pages/labor/labor',
      phrases: '/pages/phrases/phrases',
      recommend: '/pages/recommend/recommend',
      attractions: '/pages/attractions/attractions'
    };

    const route = featureRouteMap[key || name];
    if (route) {
      const url = `${route}?themeStart=${encodeURIComponent(themeStart || '')}&themeEnd=${encodeURIComponent(themeEnd || '')}`;
      wx.navigateTo({ url });
      return;
    }

    wx.showToast({
      title: `进入${name}`,
      icon: 'none'
    });
  },

  onEmergencyTap(e) {
    const { type } = e.currentTarget.dataset;
    const title = this.data.uiText[type === 'embassy' ? 'embassyLabel' : 'hotlineLabel'];
    wx.showToast({
      title,
      icon: 'none'
    });
  },

  onHomeBackTap() {
    // 首页是 tabBar 页，页面栈里没有上一页，navigateBack/redirectTo 都不可靠；
    // reLaunch 可以回到非 tab 的欢迎页并清空栈。
    wx.reLaunch({ url: '/pages/index/index' });
  },

  onTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === 'home') {
      return;
    }

    const tabRouteMap = {
      community: '/pages/community/community',
      publish: '/pages/publish/publish',
      message: '/pages/message/message',
      profile: '/pages/profile/profile'
    };

    const url = tabRouteMap[tab];
    if (!url) return;

    wx.switchTab({
      url,
      fail: () => {
        wx.showToast({
          title: this.data.language === 'zh' ? '跳转失败，请稍后重试' : this.data.language === 'en' ? 'Navigation failed, please try again' : 'Échec de navigation, réessayez',
          icon: 'none'
        });
      }
    });
  }
});
