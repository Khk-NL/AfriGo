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
        isLogin: false,
        userInfo: {},
        currentCountry: '肯尼亚',
        currentCity: '内罗毕',
        memberSince: '',
        companionNote: '',
        destinationInsight: '',
        focusLabel: '',
        riskLabel: '',
        bookmarks: [],
        quickActions: [],
        serviceEntries: [],
        profileStats: []
    },

    onShow() {
        this.refreshProfile();
    },

    refreshProfile() {
        const userInfo = wx.getStorageSync('userInfo') || null;
        const selectedDestination = wx.getStorageSync('selectedDestination') || {};
        const currentCountry = selectedDestination.zhName || '肯尼亚';
        const currentCity = COUNTRY_CITY_MAP[currentCountry] || '主要城市';
        const bookmarks = this.normalizeBookmarks(wx.getStorageSync('bookmarks') || []);
        const memberSince = this.ensureMemberSince();
        const insight = this.getCountryInsight(currentCountry, currentCity);
        const isLogin = !!userInfo;

        this.setData({
            isLogin,
            userInfo: userInfo || {},
            currentCountry,
            currentCity,
            memberSince,
            companionNote: isLogin
                ? '你的微信身份、收藏夹和旅途服务都已经汇总到这张随身面板里。'
                : '登录后可同步收藏夹、目的地与常用提醒，把出行信息收成一页。',
            destinationInsight: insight.destinationInsight,
            focusLabel: insight.focusLabel,
            riskLabel: insight.riskLabel,
            bookmarks,
            quickActions: this.buildQuickActions(bookmarks.length),
            serviceEntries: this.buildServiceEntries(currentCountry),
            profileStats: this.buildProfileStats(bookmarks.length, isLogin, currentCountry)
        });
    },

    ensureMemberSince() {
        let memberSince = wx.getStorageSync('memberSince');
        if (!memberSince) {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            memberSince = `${now.getFullYear()}.${month}`;
            wx.setStorageSync('memberSince', memberSince);
        }
        return memberSince;
    },

    normalizeBookmarks(bookmarks) {
        if (!Array.isArray(bookmarks)) {
            return [];
        }

        return bookmarks.map((item, index) => ({
            id: String(item.id || item.title || item.name || index),
            title: item.title || item.name || `已收藏内容 ${index + 1}`,
            date: item.date || '最近加入',
            category: item.category || item.type || '旅途清单'
        }));
    },

    getCountryInsight(currentCountry, currentCity) {
        const insightMap = {
            '肯尼亚': {
                destinationInsight: '内罗毕更需要关注晚间通勤、证件随身管理和约车路线确认。',
                focusLabel: '夜间交通',
                riskLabel: '中等风险'
            },
            '坦桑尼亚': {
                destinationInsight: '落地后建议优先熟悉港口与机场周边交通方式，降低临时换乘成本。',
                focusLabel: '口岸出行',
                riskLabel: '中等风险'
            },
            '尼日利亚': {
                destinationInsight: '商务活动多的区域节奏快，建议提前固化通勤与会面动线。',
                focusLabel: '商务路线',
                riskLabel: '需提高警惕'
            }
        };

        return insightMap[currentCountry] || {
            destinationInsight: `${currentCity}当前更适合优先建立稳定路线，把证件、交通和联系人放在第一顺位。`,
            focusLabel: '证件保管',
            riskLabel: '中等风险'
        };
    },

    buildProfileStats(bookmarksCount, isLogin, currentCountry) {
        return [
            {
                label: '旅途身份',
                value: isLogin ? '已激活' : '待登录',
                tone: isLogin ? 'emerald' : 'sand'
            },
            {
                label: '当前目的地',
                value: currentCountry,
                tone: 'sky'
            },
            {
                label: '收藏夹',
                value: `${bookmarksCount} 条`,
                tone: 'rose'
            },
            {
                label: '安全评分',
                value: '92',
                tone: 'gold'
            }
        ];
    },

    buildQuickActions(bookmarksCount) {
        return [
            {
                key: 'visa',
                label: '证件材料',
                meta: '签证与清单',
                icon: '🛂',
                tone: 'sky'
            },
            {
                key: 'security',
                label: '安全助手',
                meta: '预警与应急',
                icon: '🛡️',
                tone: 'emerald'
            },
            {
                key: 'bookmarks',
                label: '我的收藏',
                meta: `${bookmarksCount} 条归档`,
                icon: '✦',
                tone: 'sand'
            },
            {
                key: 'message',
                label: '消息中心',
                meta: '系统提醒',
                icon: '✉️',
                tone: 'rose'
            }
        ];
    },

    buildServiceEntries(currentCountry) {
        return [
            {
                title: '本地资讯摘要',
                subtitle: `查看${currentCountry}的生活线索与城市节奏`,
                icon: '📰',
                action: 'local-info'
            },
            {
                title: '签证材料清单',
                subtitle: '出发前最后核对一遍高频证件事项',
                icon: '🧾',
                action: 'visa'
            },
            {
                title: '安全出行提醒',
                subtitle: '同步最新风险等级与夜间出行建议',
                icon: '🛡️',
                action: 'security'
            },
            {
                title: '本地推荐路线',
                subtitle: '把住宿、交通和补给点排进同一条路线',
                icon: '🧭',
                action: 'recommend'
            },
            {
                title: '常用沟通词句',
                subtitle: '紧急场景、问路和支付对话都能快速找到',
                icon: '🗨️',
                action: 'phrases'
            },
            {
                title: '偏好与设置',
                subtitle: '通知、语言和隐私能力会在后续继续完善',
                icon: '⚙️',
                action: 'settings'
            }
        ];
    },

    getUserProfile() {
        wx.getUserProfile({
            desc: '用于完善你的旅途身份档案',
            success: (res) => {
                wx.setStorageSync('userInfo', res.userInfo);
                this.refreshProfile();
                wx.showToast({
                    title: '旅途档案已开启',
                    icon: 'success'
                });
            },
            fail: () => {
                wx.showToast({
                    title: '未完成授权',
                    icon: 'none'
                });
            }
        });
    },

    onQuickActionTap(e) {
        const { key } = e.currentTarget.dataset;

        if (key === 'visa') {
            wx.navigateTo({
                url: '/pages/logs/logs'
            });
            return;
        }

        if (key === 'security') {
            wx.navigateTo({
                url: '/pages/security/security'
            });
            return;
        }

        if (key === 'message') {
            wx.switchTab({
                url: '/pages/message/message'
            });
            return;
        }

        if (key === 'bookmarks') {
            wx.showToast({
                title: this.data.bookmarks.length ? '下方可查看收藏清单' : '收藏夹还是空的',
                icon: 'none'
            });
        }
    },

    onServiceTap(e) {
        const { action, title } = e.currentTarget.dataset;

        if (action === 'local-info') {
            wx.navigateTo({
                url: '/pages/local-info/local-info'
            });
            return;
        }

        if (action === 'visa') {
            wx.navigateTo({
                url: '/pages/logs/logs'
            });
            return;
        }

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

        if (action === 'phrases') {
            wx.navigateTo({
                url: '/pages/phrases/phrases'
            });
            return;
        }

        wx.showToast({
            title: title || '功能开发中',
            icon: 'none'
        });
    },

    onBookmarkTap(e) {
        const { title } = e.currentTarget.dataset;
        wx.showToast({
            title: title || '已打开收藏',
            icon: 'none'
        });
    },

    onRemoveBookmark(e) {
        const { id } = e.currentTarget.dataset;
        const bookmarks = this.data.bookmarks.filter((bookmark) => String(bookmark.id) !== String(id));

        wx.setStorageSync('bookmarks', bookmarks);
        this.setData({
            bookmarks,
            quickActions: this.buildQuickActions(bookmarks.length),
            profileStats: this.buildProfileStats(bookmarks.length, this.data.isLogin, this.data.currentCountry)
        });

        wx.showToast({
            title: '已移出收藏',
            icon: 'success'
        });
    },

    onLogout() {
        wx.removeStorageSync('userInfo');
        this.refreshProfile();
        wx.showToast({
            title: '已退出登录',
            icon: 'none'
        });
    },

    onTabTap(e) {
        const { tab } = e.currentTarget.dataset;
        if (tab === 'profile') {
            return;
        }

        const tabRouteMap = {
            home: '/pages/home/home',
            community: '/pages/community/community',
            publish: '/pages/publish/publish',
            message: '/pages/message/message',
            profile: '/pages/profile/profile'
        };

        const url = tabRouteMap[tab];
        if (!url) {
            wx.showToast({
                title: '页面开发中',
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