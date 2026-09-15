import { loadGuide } from '../../utils/cloud-service.js';

Page({
  data: {
    countryNameZh: '刚果(金)',
    countryNameEn: 'DR Congo',
    overallCrimeIndex: 66.7,
    crimeTypes: ['武装抢劫', '入室盗窃', '街头盗窃', '持械拦车', '夜间扒窃', '绑架勒索'],
    highRiskAreas: ['伊图里省', '北基伍省', '南基伍省', '上韦莱省', '戈马周边', '布尼亚周边'],
    specialRisk: '中资企业与矿区车队易遭武装袭击，存在绑架与财产损失风险。重点关注矿区道路、夜间驻地与长途补给路线。',
    embassyWarning: '中国驻刚果(金)使馆提醒：避免前往刚东四省，出行需结伴，妥善保管财物；矿区和长途公路须提前报备行程（2026年3月）。',
    travelTips: [
      '尽量白天通行，避免夜间城际公路与临时检查点。',
      '车辆保持半箱以上油量，随车携带离线地图与应急电源。',
      '酒店和住地选择有门禁、监控、双重安检的区域。',
      '现金分散存放，证件与现金分离，复印件单独封存。',
      '外出结伴并共享实时定位，设定固定报平安时间。'
    ],
    emergencyChecklist: [
      '护照首页与签证页照片（云端+本地双备份）',
      '使馆电话、公司安保、当地医院电话纸质留存',
      '72小时基础药品、净水片、便携手电与备用电池',
      '现金小额分包与应急交通路线卡片',
      '重要联系人中英文姓名与关系对照表'
    ],
    embassyPhone: '+243851474669',
    policePhone: '112',
    medicalPhone: '119',
    gaugeSweep: 240
  },

  onLoad() {
    const selected = wx.getStorageSync('selectedDestination') || {};
    const countryNameZh = selected.zhName || this.data.countryNameZh;
    this.setData({
      countryNameZh,
      countryNameEn: selected.enName || this.data.countryNameEn
    });
    this.loadGuideSecurity(countryNameZh);
  },

  async loadGuideSecurity(countryNameZh) {
    try {
      const guide = await loadGuide(countryNameZh);
      if (!guide || !guide.security) {
        return;
      }
      this.setData({
        ...guide.security,
        countryNameZh: guide.security.countryNameZh || countryNameZh
      });
    } catch (error) {
      console.warn('security: fallback to local', error);
    }
  },

  onCallEmbassy() {
    wx.makePhoneCall({
      phoneNumber: this.data.embassyPhone,
      fail: () => {
        wx.showToast({
          title: '拨号失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  onCallPolice() {
    wx.makePhoneCall({
      phoneNumber: this.data.policePhone,
      fail: () => {
        wx.showToast({
          title: '拨号失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  onCallMedical() {
    wx.makePhoneCall({
      phoneNumber: this.data.medicalPhone,
      fail: () => {
        wx.showToast({
          title: '拨号失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  onGoBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1
      });
      return;
    }

    wx.switchTab({
      url: '/pages/home/home'
    });
  }
});
