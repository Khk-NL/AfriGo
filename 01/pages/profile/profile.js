import { buildProfileText, getCountryName, getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';
import { getStoredCurrentUser, isAdminUser, isLoggedIn, logoutCurrentUser } from '../../utils/cloud-service.js';

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
    '赞比亚': '卢萨卡',
    '乌干达': '坎帕拉',
    '几内亚': '科纳克里',
    '刚果(布)': '布拉柴维尔',
    '利比里亚': '蒙罗维亚',
    '埃塞俄比亚': '亚的斯亚贝巴',
    '塞内加尔': '达喀尔',
    '津巴布韦': '哈拉雷',
    '摩洛哥': '拉巴特',
    '莫桑比克': '马普托',
    '阿尔及利亚': '阿尔及尔'
};

Page({
    data: {
        language: getStoredLanguage(),
        isLogin: false,
        isAdmin: false,
        currentUser: null,
        userInfo: {},
        currentCountry: '肯尼亚',
        currentCity: '内罗毕',
        memberSince: '',
        currentCountryLabel: getCountryName('肯尼亚', getStoredLanguage()),
        destinationInsight: buildProfileText(getStoredLanguage(), '肯尼亚', getCountryName('肯尼亚', getStoredLanguage()), 0, false).destinationInsight,
        focusLabel: buildProfileText(getStoredLanguage(), '肯尼亚', getCountryName('肯尼亚', getStoredLanguage()), 0, false).focusLabel,
        riskLabel: buildProfileText(getStoredLanguage(), '肯尼亚', getCountryName('肯尼亚', getStoredLanguage()), 0, false).riskLabel,
        uiText: buildProfileText(getStoredLanguage(), '肯尼亚', getCountryName('肯尼亚', getStoredLanguage()), 0, false),
        bookmarks: [],
        quickActions: [],
        serviceEntries: [],
        profileStats: []
    },

    applyLanguage(language, currentCountry = this.data.currentCountry, bookmarksCount = this.data.bookmarks.length, isLogin = this.data.isLogin) {
        const nextLanguage = normalizeLanguage(language);
        const currentCountryLabel = getCountryName(currentCountry, nextLanguage);
        this.setData({
            language: nextLanguage,
            currentCountryLabel,
            uiText: buildProfileText(nextLanguage, currentCountry, currentCountryLabel, bookmarksCount, isLogin)
        });
    },

    onShow() {
        this.refreshProfile();
    },

    refreshProfile() {
        const currentUser = getStoredCurrentUser();
        const userInfo = currentUser || null;
        const selectedDestination = wx.getStorageSync('selectedDestination') || {};
        const currentCountry = selectedDestination.zhName || '肯尼亚';
        const currentCity = COUNTRY_CITY_MAP[currentCountry] || '主要城市';
        const bookmarks = this.normalizeBookmarks(wx.getStorageSync('bookmarks') || []);
        const memberSince = this.ensureMemberSince();
        const isLogin = isLoggedIn(currentUser);
        const isAdmin = isAdminUser(currentUser);
        const currentCountryLabel = getCountryName(currentCountry, this.data.language);

        this.applyLanguage(this.data.language, currentCountry, bookmarks.length, isLogin);
        this.setData({
            isLogin,
            isAdmin,
            currentUser,
            userInfo: userInfo || {},
            currentCountry,
            currentCity,
            currentCountryLabel,
            destinationInsight: this.data.uiText.destinationInsight,
            focusLabel: this.data.uiText.focusLabel,
            riskLabel: this.data.uiText.riskLabel,
            memberSince,
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

    buildProfileStats(bookmarksCount, isLogin, currentCountry) {
        const text = buildProfileText(this.data.language, currentCountry, this.data.currentCountryLabel, bookmarksCount, isLogin);
        return text.profileStats;
    },

    buildQuickActions(bookmarksCount) {
        return buildProfileText(this.data.language, this.data.currentCountry, this.data.currentCountryLabel, bookmarksCount, this.data.isLogin).quickActions;
    },

    buildServiceEntries(currentCountry) {
        return buildProfileText(this.data.language, currentCountry, this.data.currentCountryLabel, this.data.bookmarks.length, this.data.isLogin).serviceEntries;
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
                title: this.data.language === 'zh' ? (this.data.bookmarks.length ? '下方可查看收藏清单' : '收藏夹还是空的') : this.data.language === 'en' ? (this.data.bookmarks.length ? 'See your saved list below' : 'No bookmarks yet') : (this.data.bookmarks.length ? 'Voir la liste enregistrée ci-dessous' : 'Aucun favori pour le moment'),
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
            title: title || (this.data.language === 'zh' ? '功能开发中' : this.data.language === 'en' ? 'Feature coming soon' : 'Fonction bientôt disponible'),
            icon: 'none'
        });
    },

    onBookmarkTap(e) {
        const { title } = e.currentTarget.dataset;
        wx.showToast({
            title: title || (this.data.language === 'zh' ? '已打开收藏' : this.data.language === 'en' ? 'Bookmark opened' : 'Favori ouvert'),
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
            title: this.data.language === 'zh' ? '已移出收藏' : this.data.language === 'en' ? 'Removed from bookmarks' : 'Retiré des favoris',
            icon: 'success'
        });
    },

    onLogout() {
        logoutCurrentUser();
        this.refreshProfile();
        wx.showToast({
            title: this.data.language === 'zh' ? '已退出登录' : this.data.language === 'en' ? 'Signed out' : 'Déconnecté',
            icon: 'none'
        });
    },

    onAdminCenterTap() {
        if (!this.data.isAdmin) {
            wx.showToast({
                title: this.data.language === 'zh' ? '仅管理员可进入' : this.data.language === 'en' ? 'Admins only' : 'Réservé aux administrateurs',
                icon: 'none'
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/admin/admin'
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