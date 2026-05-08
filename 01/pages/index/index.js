Page({
  data: {
    language: 'zh',
    languageOrder: ['ZH', 'EN', 'FR'],
    uiText: {},
    i18n: {
      zh: {
        mainTitle: '开启你的中非安全之旅',
        cta: '开启您期待的非洲之旅',
        brandMotto: '真境 · 中非安全指南',
        sheetTitle: '选择您的目的地',
        sheetSubtitle: 'Select Your Destination',
        searchPlaceholder: '搜索非洲国家... / Search African countries...',
        confirmSelection: '确认选择'
      },
      en: {
        mainTitle: 'Start Your Safe Journey',
        cta: 'Begin Your Dream African Journey',
        brandMotto: 'Authentic · Safety Guide',
        sheetTitle: 'Select Your Destination',
        sheetSubtitle: 'Choose your African destination',
        searchPlaceholder: 'Search African countries...',
        confirmSelection: 'Confirm Selection'
      },
      fr: {
        mainTitle: 'Commencez votre voyage en toute sécurité',
        cta: 'Commencez le voyage africain que vous attendez',
        brandMotto: 'Authentique · Guide de sécurité Afrique-Chine',
        sheetTitle: 'Choisissez votre destination',
        sheetSubtitle: 'Sélectionnez un pays africain',
        searchPlaceholder: 'Rechercher des pays africains...',
        confirmSelection: 'Confirmer'
      }
    },
    currentCountryId: 'drc',
    currentCountryZh: '刚果(金)',
    currentCountryEn: 'DR Congo',
    currentCountryImage: '/assets/images/congo-drc.png',
    currentCountryBg: 'radial-gradient(circle at 70% 20%, #cfdbef 0%, #b7c7e4 40%, #8ea8d4 100%)',
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
        image: '/assets/images/congo-drc.png',
        bg: 'radial-gradient(circle at 70% 20%, #cfdbef 0%, #b7c7e4 40%, #8ea8d4 100%)'
      },
      {
        id: 'ghana',
        zhName: '加纳',
        enName: 'Ghana',
        flag: '🇬🇭',
        bg: 'radial-gradient(circle at 70% 20%, #d9d0b8 0%, #c6b487 40%, #9a8659 100%)'
      },
      {
        id: 'egypt',
        zhName: '埃及',
        enName: 'Egypt',
        flag: '🇪🇬',
        bg: 'radial-gradient(circle at 72% 22%, #ddd6c8 0%, #cec2ac 40%, #b69e7c 100%)'
      },
      {
        id: 'angola',
        zhName: '安哥拉',
        enName: 'Angola',
        flag: '🇦🇴',
        bg: 'radial-gradient(circle at 70% 20%, #d9cbc2 0%, #c2a190 40%, #8f6b5b 100%)'
      },
      {
        id: 'nigeria',
        zhName: '尼日利亚',
        enName: 'Nigeria',
        flag: '🇳🇬',
        bg: 'radial-gradient(circle at 70% 20%, #d4dfd4 0%, #b6ccba 40%, #7da18a 100%)'
      },
      {
        id: 'south-africa',
        zhName: '南非',
        enName: 'South Africa',
        flag: '🇿🇦',
        bg: 'radial-gradient(circle at 70% 20%, #d2d7cf 0%, #b9c3b2 40%, #87967f 100%)'
      },
      {
        id: 'madagascar',
        zhName: '马达加斯加',
        enName: 'Madagascar',
        flag: '🇲🇬',
        bg: 'radial-gradient(circle at 70% 20%, #d9d0cb 0%, #c6b7ae 40%, #9a8578 100%)'
      },
      {
        id: 'tanzania',
        zhName: '坦桑尼亚',
        enName: 'Tanzania',
        flag: '🇹🇿',
        bg: 'radial-gradient(circle at 70% 20%, #d7d2c8 0%, #cfc8bb 35%, #b8ae9f 100%)'
      },
      {
        id: 'kenya',
        zhName: '肯尼亚',
        enName: 'Kenya',
        flag: '🇰🇪',
        bg: 'radial-gradient(circle at 70% 20%, #d8cfbf 0%, #cabca5 38%, #aa9575 100%)'
      },
      {
        id: 'cote-divoire',
        zhName: '科特迪瓦',
        enName: "Côte d'Ivoire",
        flag: '🇨🇮',
        bg: 'radial-gradient(circle at 70% 20%, #dfd5c9 0%, #ccb79d 40%, #a68662 100%)'
      },
      {
        id: 'zambia',
        zhName: '赞比亚',
        enName: 'Zambia',
        flag: '🇿🇲',
        bg: 'radial-gradient(circle at 70% 20%, #d2dbc8 0%, #b6c7a2 40%, #839662 100%)'
      }
    ],
    filteredCountries: []
  },

  onFlipLanguage() {
    const rotatedOrder = this.data.languageOrder.slice();
    const firstLanguage = rotatedOrder.shift();
    rotatedOrder.push(firstLanguage);

    const nextLanguage = rotatedOrder[0].toLowerCase();

    this.setData({
      languageOrder: rotatedOrder,
      language: nextLanguage,
      uiText: this.data.i18n[nextLanguage]
    });

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

    this.setData({
      filteredCountries: this.data.countries,
      uiText: this.data.i18n[this.data.language]
    });
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

    this.setData({
      isCountryTransition: true
    });

    setTimeout(() => {
      this.setData({
        currentCountryId: selectedCountry.id,
        currentCountryZh: selectedCountry.zhName,
        currentCountryEn: selectedCountry.enName,
        currentCountryImage: selectedCountry.image || '',
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
        enName: this.data.currentCountryEn
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
