import { buildIndexText, getCountryName, getStoredLanguage, normalizeLanguage, setStoredLanguage } from '../../utils/i18n.js';
import { getStoredCurrentUser, isAdminUser, isLoggedIn, logoutCurrentUser, syncWeChatLogin } from '../../utils/cloud-service.js';

const getCountryImages = (country) => {
  if (country && Array.isArray(country.images) && country.images.length) {
    return country.images;
  }
  return country && country.image ? [country.image] : [];
};

Page({
  data: {
    language: getStoredLanguage(),
    languageOrder: ['ZH', 'EN', 'FR'],
    uiText: buildIndexText(getStoredLanguage()),
    currentUser: null,
    isLogin: false,
    isAdmin: false,
    currentCountryId: 'drc',
    currentCountryZh: '刚果(金)',
    currentCountryEn: 'DR Congo',
    currentCountryLabel: getCountryName('刚果(金)', getStoredLanguage()),
    currentCountryImage: '/assets/images/covers/drc.jpg',
    currentCountryBg: 'radial-gradient(circle at 70% 20%, #cfdbef 0%, #b7c7e4 40%, #8ea8d4 100%)',
    currentCoverImages: ['/assets/images/covers/drc.jpg', '/assets/images/covers/roc.jpg'],
    currentCoverIndex: 0,
    ctaPressed: false,
    sheetVisible: false,
    countryKeyword: '',
    pendingCountryId: 'drc',
    isCountryTransition: false,
    countries: [
      {
        id: 'drc',
        zhName: '刚果(金)',
        enName: 'DR Congo',
        flag: '🇨🇩',
        image: '/assets/images/covers/drc.jpg',
        images: ['/assets/images/covers/drc.jpg', '/assets/images/covers/roc.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #cfdbef 0%, #b7c7e4 40%, #8ea8d4 100%)'
      },
      {
        id: 'ghana',
        zhName: '加纳',
        enName: 'Ghana',
        flag: '🇬🇭',
        image: '/assets/images/covers/ghana.jpg',
        images: ['/assets/images/covers/ghana.jpg', '/assets/images/covers/ghana-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d9d0b8 0%, #c6b487 40%, #9a8659 100%)'
      },
      {
        id: 'egypt',
        zhName: '埃及',
        enName: 'Egypt',
        flag: '🇪🇬',
        image: '/assets/images/covers/egypt.jpg',
        images: ['/assets/images/covers/egypt.jpg', '/assets/images/covers/egypt-2.jpg'],
        bg: 'radial-gradient(circle at 72% 22%, #ddd6c8 0%, #cec2ac 40%, #b69e7c 100%)'
      },
      {
        id: 'angola',
        zhName: '安哥拉',
        enName: 'Angola',
        flag: '🇦🇴',
        image: '/assets/images/covers/angola.jpg',
        images: ['/assets/images/covers/angola.jpg', '/assets/images/covers/angola-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d9cbc2 0%, #c2a190 40%, #8f6b5b 100%)'
      },
      {
        id: 'nigeria',
        zhName: '尼日利亚',
        enName: 'Nigeria',
        flag: '🇳🇬',
        image: '/assets/images/covers/nigeria.jpg',
        images: ['/assets/images/covers/nigeria.jpg', '/assets/images/covers/nigeria-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d4dfd4 0%, #b6ccba 40%, #7da18a 100%)'
      },
      {
        id: 'south-africa',
        zhName: '南非',
        enName: 'South Africa',
        flag: '🇿🇦',
        image: '/assets/images/covers/south-africa.jpg',
        images: ['/assets/images/covers/south-africa.jpg', '/assets/images/covers/south-africa-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d2d7cf 0%, #b9c3b2 40%, #87967f 100%)'
      },
      {
        id: 'madagascar',
        zhName: '马达加斯加',
        enName: 'Madagascar',
        flag: '🇲🇬',
        image: '/assets/images/covers/madagascar.jpg',
        images: ['/assets/images/covers/madagascar.jpg', '/assets/images/covers/madagascar-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d9d0cb 0%, #c6b7ae 40%, #9a8578 100%)'
      },
      {
        id: 'tanzania',
        zhName: '坦桑尼亚',
        enName: 'Tanzania',
        flag: '🇹🇿',
        image: '/assets/images/covers/tanzania.jpg',
        images: ['/assets/images/covers/tanzania.jpg', '/assets/images/covers/tanzania-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d7d2c8 0%, #cfc8bb 35%, #b8ae9f 100%)'
      },
      {
        id: 'kenya',
        zhName: '肯尼亚',
        enName: 'Kenya',
        flag: '🇰🇪',
        image: '/assets/images/covers/kenya.jpg',
        images: ['/assets/images/covers/kenya.jpg', '/assets/images/covers/kenya-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d8cfbf 0%, #cabca5 38%, #aa9575 100%)'
      },
      {
        id: 'cote-divoire',
        zhName: '科特迪瓦',
        enName: "Côte d'Ivoire",
        flag: '🇨🇮',
        image: '/assets/images/covers/cote-divoire.jpg',
        images: ['/assets/images/covers/cote-divoire.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #dfd5c9 0%, #ccb79d 40%, #a68662 100%)'
      },
      {
        id: 'zambia',
        zhName: '赞比亚',
        enName: 'Zambia',
        flag: '🇿🇲',
        image: '/assets/images/covers/zambia.jpg',
        images: ['/assets/images/covers/zambia.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d2dbc8 0%, #b6c7a2 40%, #839662 100%)'
      },
      {
        id: 'uganda',
        zhName: '乌干达',
        enName: 'Uganda',
        flag: '🇺🇬',
        image: '/assets/images/covers/uganda.jpg',
        images: ['/assets/images/covers/uganda.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d7e0c8 0%, #b7c89a 40%, #7f9460 100%)'
      },
      {
        id: 'guinea',
        zhName: '几内亚',
        enName: 'Guinea',
        flag: '🇬🇳',
        image: '/assets/images/covers/guinea.jpg',
        images: [
          '/assets/images/covers/guinea.jpg',
          '/assets/images/covers/guinea-2.jpg',
          '/assets/images/covers/guinea-3.jpg'
        ],
        bg: 'radial-gradient(circle at 70% 20%, #d9d4c4 0%, #c4b896 40%, #8f7d55 100%)'
      },
      {
        id: 'roc',
        zhName: '刚果(布)',
        enName: 'Congo',
        flag: '🇨🇬',
        image: '/assets/images/covers/roc.jpg',
        images: ['/assets/images/covers/roc.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #cfe0d8 0%, #a7c4b6 40%, #6d9484 100%)'
      },
      {
        id: 'liberia',
        zhName: '利比里亚',
        enName: 'Liberia',
        flag: '🇱🇷',
        image: '/assets/images/covers/liberia.jpg',
        images: ['/assets/images/covers/liberia.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #e4d4d0 0%, #c9a8a3 40%, #9a6d68 100%)'
      },
      {
        id: 'ethiopia',
        zhName: '埃塞俄比亚',
        enName: 'Ethiopia',
        flag: '🇪🇹',
        image: '/assets/images/covers/ethiopia.jpg',
        images: ['/assets/images/covers/ethiopia.jpg', '/assets/images/covers/ethiopia-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #dccfc0 0%, #c3ad8e 40%, #8f7352 100%)'
      },
      {
        id: 'senegal',
        zhName: '塞内加尔',
        enName: 'Senegal',
        flag: '🇸🇳',
        image: '/assets/images/covers/senegal.jpg',
        images: ['/assets/images/covers/senegal.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #e2d8c2 0%, #cbb98a 40%, #a07d48 100%)'
      },
      {
        id: 'zimbabwe',
        zhName: '津巴布韦',
        enName: 'Zimbabwe',
        flag: '🇿🇼',
        image: '/assets/images/covers/zimbabwe.jpg',
        images: ['/assets/images/covers/zimbabwe.jpg', '/assets/images/covers/zimbabwe-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d6ddd0 0%, #b4c3ae 40%, #7a9174 100%)'
      },
      {
        id: 'morocco',
        zhName: '摩洛哥',
        enName: 'Morocco',
        flag: '🇲🇦',
        image: '/assets/images/covers/morocco.jpg',
        images: ['/assets/images/covers/morocco.jpg', '/assets/images/covers/morocco-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d7e3ea 0%, #9bb8c9 40%, #5e8498 100%)'
      },
      {
        id: 'mozambique',
        zhName: '莫桑比克',
        enName: 'Mozambique',
        flag: '🇲🇿',
        image: '/assets/images/covers/mozambique.jpg',
        images: ['/assets/images/covers/mozambique.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #d4e4e8 0%, #a8c7ce 40%, #6a939c 100%)'
      },
      {
        id: 'algeria',
        zhName: '阿尔及利亚',
        enName: 'Algeria',
        flag: '🇩🇿',
        image: '/assets/images/covers/algeria.jpg',
        images: ['/assets/images/covers/algeria.jpg', '/assets/images/covers/algeria-2.jpg'],
        bg: 'radial-gradient(circle at 70% 20%, #e6dcc8 0%, #d2c09a 40%, #b08a55 100%)'
      }
    ],
    filteredCountries: []
  },

  applyLanguage(language) {
    const nextLanguage = normalizeLanguage(language);
    this.setData({
      language: nextLanguage,
      uiText: buildIndexText(nextLanguage),
      currentCountryLabel: getCountryName(this.data.currentCountryZh, nextLanguage)
    });
  },

  refreshAuthState() {
    const currentUser = getStoredCurrentUser();
    this.setData({
      currentUser,
      isLogin: isLoggedIn(currentUser),
      isAdmin: isAdminUser(currentUser)
    });
  },

  async onAuthTap() {
    if (this.data.isLogin) {
      this.onLogoutTap();
      return;
    }

    try {
      const currentUser = await syncWeChatLogin({
        desc: '用于在非常行中完成微信登录与身份同步'
      });

      this.setData({
        currentUser,
        isLogin: true,
        isAdmin: isAdminUser(currentUser)
      });

      wx.showToast({
        title: this.data.language === 'zh' ? '登录成功' : this.data.language === 'en' ? 'Logged in' : 'Connexion réussie',
        icon: 'success'
      });
    } catch (error) {
      console.error('index: login failed', error);
      wx.showToast({
        title: this.data.language === 'zh' ? '登录失败，请稍后重试' : this.data.language === 'en' ? 'Login failed, please try again' : 'Échec de la connexion, veuillez réessayer',
        icon: 'none'
      });
    }
  },

  onLogoutTap() {
    logoutCurrentUser();
    this.refreshAuthState();

    wx.showToast({
      title: this.data.language === 'zh' ? '已退出登录' : this.data.language === 'en' ? 'Signed out' : 'Déconnecté',
      icon: 'none'
    });
  },

  onFlipLanguage() {
    const rotatedOrder = this.data.languageOrder.slice();
    const firstLanguage = rotatedOrder.shift();
    rotatedOrder.push(firstLanguage);

    const nextLanguage = rotatedOrder[0].toLowerCase();
    setStoredLanguage(nextLanguage);

    this.setData({ languageOrder: rotatedOrder });
    this.applyLanguage(nextLanguage);

    this.triggerHaptic('light');
  },

  onLoad() {
    // 设置导航栏（老钱风配色）
    wx.setNavigationBarColor({
      frontColor: '#282521',
      backgroundColor: '#f4f1eb',
      animation: { duration: 300, timingFunc: 'easeIn' }
    });

    // 页面加载触觉反馈
    this.triggerHaptic('medium');

    this.applyLanguage(this.data.language);
    this.refreshAuthState();
    const currentCountry = this.data.countries.find((item) => item.id === this.data.currentCountryId);
    const coverImages = getCountryImages(currentCountry);
    this.setData({
      filteredCountries: this.data.countries,
      currentCountryLabel: getCountryName(this.data.currentCountryZh, this.data.language),
      currentCoverImages: coverImages,
      currentCoverIndex: 0,
      currentCountryImage: coverImages[0] || this.data.currentCountryImage
    });
  },

  onShow() {
    this.refreshAuthState();
  },

  /**
   * 触觉反馈（物理质感）
   */
  triggerHaptic(type = 'light') {
    if (!wx.vibrateShort) return;
    const typeMap = { light: 'light', medium: 'medium', heavy: 'heavy' };
    wx.vibrateShort({ type: typeMap[type] || 'light' });
  },

  openCountrySheet() {
    this.setData({
      sheetVisible: true,
      countryKeyword: '',
      filteredCountries: this.data.countries,
      pendingCountryId: this.data.currentCountryId
    });
    this.triggerHaptic('light');
  },

  closeCountrySheet() {
    this.setData({
      sheetVisible: false
    });
  },

  onCountrySearchInput(e) {
    const keyword = (e.detail.value || '').trim().toLowerCase();
    const filteredCountries = this.data.countries.filter((country) => {
      return (
        country.zhName.includes(keyword) ||
        country.enName.toLowerCase().includes(keyword)
      );
    });

    this.setData({
      countryKeyword: e.detail.value || '',
      filteredCountries
    });
  },

  onCountrySelect(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      pendingCountryId: id
    });
    this.triggerHaptic('light');
  },

  confirmCountrySelection() {
    const selectedCountry = this.data.countries.find((item) => item.id === this.data.pendingCountryId);
    if (!selectedCountry) {
      this.closeCountrySheet();
      return;
    }

    this.setData({
      sheetVisible: false
    });

    if (selectedCountry.id === this.data.currentCountryId) {
      return;
    }

    const selectedCountryLabel = getCountryName(selectedCountry.zhName, this.data.language);

    this.setData({
      isCountryTransition: true
    });

    const coverImages = getCountryImages(selectedCountry);

    setTimeout(() => {
      this.setData({
        currentCountryId: selectedCountry.id,
        currentCountryZh: selectedCountry.zhName,
        currentCountryEn: selectedCountry.enName,
        currentCountryLabel: selectedCountryLabel,
        currentCoverImages: coverImages,
        currentCoverIndex: 0,
        currentCountryImage: coverImages[0] || selectedCountry.image || '',
        currentCountryBg: selectedCountry.bg
      });
      this.logEvent('destination_switched', {
        country: selectedCountry.zhName
      });
    }, 150);

    setTimeout(() => {
      this.setData({
        isCountryTransition: false
      });
    }, 320);
  },

  onCoverTap() {
    const images = this.data.currentCoverImages || [];
    if (images.length < 2) {
      return;
    }

    const nextIndex = (this.data.currentCoverIndex + 1) % images.length;
    this.triggerHaptic('light');
    this.setData({
      isCountryTransition: true
    });

    setTimeout(() => {
      this.setData({
        currentCoverIndex: nextIndex,
        currentCountryImage: images[nextIndex]
      });
    }, 120);

    setTimeout(() => {
      this.setData({
        isCountryTransition: false
      });
    }, 280);
  },

  /**
   * CTA 按钮按下 - 深祖母绿阴影收缩
   */
  onCTAPress() {
    this.setData({
      ctaPressed: true
    });
    this.triggerHaptic('light');
  },

  /**
   * CTA 按钮释放
   */
  onCTARelease() {
    this.setData({
      ctaPressed: false
    });
  },

  /**
   * 开始旅程 - 进入完整指南
   */
  onStartJourney() {
    this.setData({
      ctaPressed: false
    });

    this.triggerHaptic('medium');

    // 延迟以展示按钮动画
    setTimeout(() => {
      // 1. 存储选中的国家信息
      wx.setStorageSync('selectedDestination', {
        id: this.data.currentCountryId,
        zhName: this.data.currentCountryZh,
        enName: this.data.currentCountryEn,
        label: this.data.currentCountryLabel,
        image: this.data.currentCountryImage || ''
      });

      // 2. TabBar 页面必须使用 switchTab 进入
      wx.switchTab({
        url: '/pages/home/home',
        success: () => {
          console.log("成功跳转至主页");
        },
        fail: (err) => {
          console.error("跳转失败详情:", err);
          wx.showModal({
            title: '跳转提示',
            content: '请确认 app.json 的 tabBar.list 中已配置 pages/home/home',
            showCancel: false
          });
        }
      });
    }, 150);
  },

  /**
   * 事件埋点
   */
  logEvent(eventName, data = {}) {
    try {
      const analyticsData = {};
      Object.keys(data).forEach((key) => {
        analyticsData[key] = data[key];
      });
      analyticsData.timestamp = Date.now();
      wx.reportAnalytics(eventName, analyticsData);
    } catch (e) {
      console.log('Analytics service unavailable');
    }
  }
});
