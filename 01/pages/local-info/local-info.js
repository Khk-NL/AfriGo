const DEFAULT_THEME_START = '#FFF3E0';
const DEFAULT_THEME_END = '#FFE0B2';

const COUNTRY_CITY_MAP = {
  '刚果(金)': '金沙萨',
  '加纳': '阿克拉',
  '埃及': '开罗',
  '安哥拉': '罗安达',
  '尼日利亚': '阿布贾',
  '南非': '约翰内斯堡',
  '马达加斯加': '塔那那利佛',
  '坦桑尼亚': '达累斯萨拉姆',
  '肯尼亚': '内罗毕',
  '科特迪瓦': '阿比让',
  '赞比亚': '卢萨卡'
};

Page({
  data: {
    themeStart: DEFAULT_THEME_START,
    themeEnd: DEFAULT_THEME_END,
    pageThemeStyle: `--theme-start:${DEFAULT_THEME_START};--theme-end:${DEFAULT_THEME_END};`,
    countryName: '肯尼亚',
    cityName: '内罗毕',
    summary: '',
    pulseItems: [],
    serviceItems: [],
    livingTips: []
  },

  onLoad(options) {
    const themeStart = decodeURIComponent((options && options.themeStart) || DEFAULT_THEME_START);
    const themeEnd = decodeURIComponent((options && options.themeEnd) || DEFAULT_THEME_END);
    const selectedDestination = wx.getStorageSync('selectedDestination') || {};
    const countryName = selectedDestination.zhName || '肯尼亚';
    const cityName = COUNTRY_CITY_MAP[countryName] || '主要城市';
    const content = this.buildContent(countryName, cityName);

    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: themeEnd,
      animation: {
        duration: 160,
        timingFunc: 'easeIn'
      }
    });

    this.setData({
      themeStart,
      themeEnd,
      pageThemeStyle: `--theme-start:${themeStart};--theme-end:${themeEnd};`,
      countryName,
      cityName,
      summary: content.summary,
      pulseItems: content.pulseItems,
      serviceItems: content.serviceItems,
      livingTips: content.livingTips
    });
  },

  buildContent(countryName, cityName) {
    return {
      summary: `${cityName}近期整体节奏平稳，建议把夜间交通、证件保管和本地支付方式作为优先关注项。`,
      pulseItems: [
        {
          tag: '实时提醒',
          title: `${cityName}晚高峰通勤压力上升`,
          desc: '工作日 17:00 以后建议优先选择主干道或正规网约车，尽量避免临时换乘。',
          action: 'recommend'
        },
        {
          tag: '生活资讯',
          title: `${countryName}常用支付以现金和移动支付并行为主`,
          desc: '大额消费建议提前确认是否支持刷卡，日常小额场景保留零钱会更稳妥。',
          action: 'tips'
        },
        {
          tag: '安全观察',
          title: '夜间单独出行尽量减少临时变更路线',
          desc: '提前把目的地、车辆信息和预计到达时间同步给同行联系人，会更安全。',
          action: 'security'
        }
      ],
      serviceItems: [
        {
          icon: '🛡️',
          title: '查看安全提醒',
          subtitle: '同步使馆建议与出行风险等级',
          action: 'security'
        },
        {
          icon: '🧭',
          title: '打开出行推荐',
          subtitle: '美食、住宿与交通路线一页掌握',
          action: 'recommend'
        },
        {
          icon: '💬',
          title: '进入消息中心',
          subtitle: '把你的提问与提醒留在一个收件箱里',
          action: 'message'
        }
      ],
      livingTips: [
        {
          title: '证件随身但分层放置',
          desc: '原件、复印件和电子扫描件建议分开保管，酒店外出时尽量不要全部带在同一个包里。'
        },
        {
          title: '首次到达先确认可信交通方式',
          desc: `抵达${cityName}后，优先建立一套固定的接送、打车或步行路线，能显著降低临时判断成本。`
        },
        {
          title: '保留一份本地联系人名单',
          desc: '把酒店、使馆、同事或导游的联系电话保存到常用联系人里，离线状态也能快速找到。'
        }
      ]
    };
  },

  onBackTap() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/home/home'
        });
      }
    });
  },

  onActionTap(e) {
    const { action, title } = e.currentTarget.dataset;

    if (action === 'security') {
      wx.navigateTo({
        url: '/pages/security/security'
      });
      return;
    }

    if (action === 'recommend') {
      wx.navigateTo({
        url: '/pages/recommend/recommend'
      });
      return;
    }

    if (action === 'message') {
      wx.switchTab({
        url: '/pages/message/message'
      });
      return;
    }

    wx.showToast({
      title: title || '更多资讯整理中',
      icon: 'none'
    });
  }
});