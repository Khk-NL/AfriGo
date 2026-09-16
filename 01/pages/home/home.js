import { ElephantRenderer } from '../../utils/elephant-renderer.js';
import { createPost, loadCollectionWithFallback } from '../../utils/cloud-service.js';
import { buildHomeText, getCountryName, getStoredLanguage, normalizeLanguage, setStoredLanguage } from '../../utils/i18n.js';

const { attractions: localAttractionsData } = require('../../data/attractions.js');
const { recommend: localRecommendData } = require('../../data/recommend.js');

const DEFAULT_COUNTRY = '肯尼亚';

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

  if (!candidates.includes(DEFAULT_COUNTRY)) {
    candidates.push(DEFAULT_COUNTRY);
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

  const matchedList = withCountryField.length ? withCountryField : docs.filter(item => !item.countryZh && !item.country && !item.destination && !item.region && !item.area);
  const finalList = matchedList.length ? matchedList : docs;

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
    recommendList: []
  },

  applyLanguage(language, countryZh = this.data.currentCountryZh) {
    const nextLanguage = normalizeLanguage(language);
    this.setData({
      language: nextLanguage,
      currentCountryZh: countryZh,
      uiText: buildHomeText(nextLanguage, countryZh)
    });
  },

  onLoad() {
    const language = getStoredLanguage();
    const cached = wx.getStorageSync('selectedDestination') || {};
    const countryZh = cached.zhName || '肯尼亚';

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
  },

  onShow() {
    const cached = wx.getStorageSync('selectedDestination');
    const countryZh = cached && cached.zhName ? cached.zhName : '肯尼亚';

    if (cached && cached.zhName) {
      this.applyLanguage(this.data.language, cached.zhName);
      if (this._homeCollectionsCountry !== cached.zhName) {
        this.loadHomeCollections(cached.zhName);
      }
      return;
    }

    this.applyLanguage(this.data.language, countryZh);
    if (this._homeCollectionsCountry !== countryZh) {
      this.loadHomeCollections(countryZh);
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
        const cssWidth = 160;
        const cssHeight = 160;
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

  onFeatureTap(e) {
    const { key, name, themeStart, themeEnd } = e.currentTarget.dataset;
    if (key === 'attractions') return;

    const featureRouteMap = {
      visa: '/pages/logs/logs',
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
