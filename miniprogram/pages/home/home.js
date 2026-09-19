import { ElephantRenderer } from '../../utils/elephant-renderer.js';
import { createPost, loadCollectionWithFallback } from '../../utils/cloud-service.js';
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
    isAnimating: false,
    isChatOpen: false,
    isElephantRevealed: false,
    currentCountryZh: '肯尼亚',
    uiText: buildHomeText(getStoredLanguage(), '肯尼亚'),
    attractionsList: [],
    recommendList: [],
    tripPreview: { progress: 0, label: '开始制定行前计划' },
    journeyTools: buildJourneyTools(getStoredLanguage()),
    homeServices: HOME_SERVICES
  },

  applyLanguage(language, countryZh = this.data.currentCountryZh) {
    const nextLanguage = normalizeLanguage(language);
    this.setData({
      language: nextLanguage,
      currentCountryZh: countryZh,
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
    this.loadHomeCollections(countryZh);
    this.loadTripPreview(cached.code);
  },

  onShow() {
    const cached = getSelectedDestination();
    const countryZh = cached.zhName;
    const language = getStoredLanguage();

    this.applyLanguage(language, countryZh);
    if (this._homeCollectionsCountry !== countryZh) {
      this.loadHomeCollections(countryZh);
    }
    this.loadTripPreview(cached.code);
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

  async uploadPost(content) {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent) {
      throw new Error('帖子内容不能为空');
    }

    return createPost({ content: trimmedContent });
  },

  onReady() {
    wx.createSelectorQuery().select('#lottie-canvas').node(res => {
      if (!res || !res.node) {
        console.warn('home: lottie canvas node not found');
        return;
      }

      try {
        const canvas = res.node;
        const context = canvas.getContext('2d');
        if (!context) {
          console.warn('home: canvas 2d context unavailable');
          return;
        }

        // 设置高分辨率防锯齿
        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = windowInfo.pixelRatio || 1;
        const cssWidth = 112;
        const cssHeight = 112;
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        context.scale(dpr, dpr);

        // 渲染器实例不要放入 data，避免 setData 序列化失败
        const renderer = new ElephantRenderer(canvas, context);
        renderer.setState('peek');
        renderer.start();
        this.elephantRenderer = renderer;
      } catch (error) {
        console.error('home: elephant renderer init failed', error);
      }
    }).exec();
  },

  handleTapElephant() {
    if (this.data.isAnimating) return;
    
    // 触觉真实反馈
    wx.vibrateShort({
      type: 'medium'
    });

    const isRevealed = this.data.isElephantRevealed;
    const renderer = this.elephantRenderer;

    if (!isRevealed) {
      // 从右侧出来，变成开心状态，打开气泡
      this.setData({ isElephantRevealed: true, isAnimating: true, isChatOpen: true });
      if (renderer) {
        renderer.setState('happy');
        
        // 1.5 秒后恢复闲置动画，但依然停留在页面中心
        setTimeout(() => {
          renderer.setState('idle');
          this.setData({ isAnimating: false });
        }, 1500);
      } else {
        this.setData({ isAnimating: false });
      }
    } else {
      // 如果已经出来了，再次点击就收起气泡，并躲回右边去
      this.setData({ isElephantRevealed: false, isAnimating: true, isChatOpen: false });
      
      if (renderer) {
        // 躲回去的时候不开心了，恢复静默闲置即可
        renderer.setState('peek');
        setTimeout(() => {
          this.setData({ isAnimating: false });
        }, 800); // 等待 CSS transition 平滑过去
      } else {
        this.setData({ isAnimating: false });
      }
    }
  },

  onUnload() {
    const renderer = this.elephantRenderer;
    if (renderer) {
      renderer.stop();
    }
    this.elephantRenderer = null;
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
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({
          url: '/pages/index/index'
        });
      }
    });
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
