import { ElephantRenderer } from '../../utils/elephant-renderer.js';

Page({
  data: {
    isAnimating: false,
    isChatOpen: false,
    isElephantRevealed: false,
    welcomeCountryZh: '肯尼亚',
    welcomeSubtitle: '肯尼亚，内罗毕',
    tags: ['#内罗毕', '#签证', '#历史', '#马赛马拉', '#摩...'],
    features: [
      { label: '签证指南', icon: '🛂', bg: '#dceeff', themeStart: '#dceeff', themeEnd: '#ffffff' },
      { label: '防疫健康', icon: '✚', bg: 'linear-gradient(135deg, #FDFDFD 0%, #FFF8E1 100%)', themeStart: '#FDFDFD', themeEnd: '#FFF8E1' },
      { label: '当地风俗', icon: '🎭', bg: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 100%)', themeStart: '#FCE4EC', themeEnd: '#F8BBD0' },
      { label: '本地资讯', icon: '📰', bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', themeStart: '#FFF3E0', themeEnd: '#FFE0B2' },
      { label: '出行推荐', icon: '🧭', bg: 'linear-gradient(135deg, #FFFDE7 0%, #FFECB3 100%)', themeStart: '#FFFDE7', themeEnd: '#FFECB3' },
      { label: '劳务合规', icon: '🤝', bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)', themeStart: '#E3F2FD', themeEnd: '#BBDEFB' },
      { label: '实用词句', icon: '🗨️', bg: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)', themeStart: '#F3E5F5', themeEnd: '#E1BEE7' },
      { label: '景点攻略', icon: '🗺️', bg: 'linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%)', themeStart: '#E0F7FA', themeEnd: '#B2EBF2' }
    ]
  },

  onLoad() {
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#f8f9fa',
      animation: {
        duration: 200,
        timingFunc: 'easeIn'
      }
    });
  },

  onShow() {
    const cached = wx.getStorageSync('selectedDestination');
    const subtitleMap = {
      '刚果(金)': '刚果(金)，金沙萨',
      '加纳': '加纳，阿克拉',
      '埃及': '埃及，开罗',
      '安哥拉': '安哥拉，罗安达',
      '尼日利亚': '尼日利亚，阿布贾',
      '南非': '南非，约翰内斯堡',
      '马达加斯加': '马达加斯加，塔那那利佛',
      '坦桑尼亚': '坦桑尼亚，达累斯萨拉姆',
      '肯尼亚': '肯尼亚，内罗毕',
      '科特迪瓦': '科特迪瓦，阿比让',
      '赞比亚': '赞比亚，卢萨卡'
    };

    if (cached && cached.zhName) {
      this.setData({
        welcomeCountryZh: cached.zhName,
        welcomeSubtitle: subtitleMap[cached.zhName] || `${cached.zhName}，签证与出行`
      });
      return;
    }

    this.setData({
      welcomeCountryZh: '肯尼亚',
      welcomeSubtitle: '肯尼亚，内罗毕'
    });
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

  onFilterTap() {
    wx.showToast({
      title: '筛选功能开发中',
      icon: 'none'
    });
  },

  onTagTap(e) {
    const { tag } = e.currentTarget.dataset;
    wx.showToast({
      title: `已选择${tag}`,
      icon: 'none',
    });
  },

  onMoreTap() {
    wx.showToast({
      title: '更多安全资讯开发中',
      icon: 'none'
    });
  },

  onOpenSecurityGuide() {
    wx.navigateTo({
      url: '/pages/security/security'
    });
  },

  onFeatureTap(e) {
    const { name, themeStart, themeEnd } = e.currentTarget.dataset;
    if (name === '景点攻略') return;

    const featureRouteMap = {
      '签证指南': '/pages/logs/logs',
      '本地资讯': '/pages/local-info/local-info',
      '防疫健康': '/pages/home/health',
      '当地风俗': '/pages/customs/customs',
      '劳务合规': '/pages/labor/labor',
      '实用词句': '/pages/phrases/phrases',
      '出行推荐': '/pages/recommend/recommend'
    };

    const route = featureRouteMap[name];
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
    const title = type === 'embassy' ? '致电大使馆' : '紧急电话';
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
    if (!url) {
      wx.showToast({
        title: `${tab}开发中`,
        icon: 'none'
      });
      return;
    }

    wx.switchTab({
      url,
      fail: () => {
        wx.showToast({
          title: '跳转失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  }
});