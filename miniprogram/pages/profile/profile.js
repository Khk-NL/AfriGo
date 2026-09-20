import { buildProfileText, getCountryName, getStoredLanguage, normalizeLanguage, setStoredLanguage } from '../../utils/i18n.js';
import { deleteCurrentAccount, getStoredCurrentUser, isAdminUser, isLoggedIn, loadBookmarks, logoutCurrentUser, removeBookmark, syncWeChatLogin, updateMyProfile, uploadAvatar } from '../../utils/cloud-service.js';

const LOGIN_TEXT = {
    zh: { loading: '登录中', success: '登录成功', failed: '登录失败，请稍后重试' },
    en: { loading: 'Signing in', success: 'Signed in', failed: 'Sign-in failed, please retry' },
    fr: { loading: 'Connexion', success: 'Connecté', failed: 'Échec de la connexion' }
};

// 微信已不再下发真实头像昵称，只能引导用户自己填写，因此这里给出编辑文案
const EDIT_TEXT = {
    zh: { placeholder: '点击填写昵称', save: '保存资料', saving: '保存中', saved: '资料已更新', needName: '请先填写昵称', failed: '保存失败，请稍后重试' },
    en: { placeholder: 'Tap to set a nickname', save: 'Save', saving: 'Saving', saved: 'Profile updated', needName: 'Please enter a nickname', failed: 'Save failed, please retry' },
    fr: { placeholder: 'Touchez pour saisir un pseudo', save: 'Enregistrer', saving: 'Enregistrement', saved: 'Profil mis à jour', needName: 'Veuillez saisir un pseudo', failed: 'Échec de l’enregistrement' }
};

const REMINDER_STORAGE_KEY = 'inAppRemindersEnabled';
const LANGUAGE_OPTIONS = [
    { code: 'zh', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' }
];

const SETTINGS_TEXT = {
    zh: { title: '偏好与设置', subtitle: '设置仅影响当前设备上的小程序体验', language: '界面语言', reminders: '应用内未读提醒', remindersDesc: '关闭后消息仍保留，但不显示未读红点', privacy: '隐私与数据说明', privacyDesc: '查看本地与服务端保存的数据', deleteAccount: '删除账号及关联数据' },
    en: { title: 'Preferences & settings', subtitle: 'These settings apply to this device', language: 'Interface language', reminders: 'In-app unread reminders', remindersDesc: 'Messages remain available when unread dots are hidden', privacy: 'Privacy & data', privacyDesc: 'Review locally and remotely stored data', deleteAccount: 'Delete account and related data' },
    fr: { title: 'Préférences & réglages', subtitle: 'Ces réglages s’appliquent à cet appareil', language: 'Langue de l’interface', reminders: 'Rappels non lus intégrés', remindersDesc: 'Les messages restent disponibles sans pastille rouge', privacy: 'Confidentialité et données', privacyDesc: 'Voir les données locales et distantes', deleteAccount: 'Supprimer le compte et ses données' }
};

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
        activeTab: 'profile',
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
        profileStats: [],
        settingsVisible: false,
        languageOptions: LANGUAGE_OPTIONS.map((item) => item.label),
        languageIndex: Math.max(0, LANGUAGE_OPTIONS.findIndex((item) => item.code === getStoredLanguage())),
        remindersEnabled: wx.getStorageSync(REMINDER_STORAGE_KEY) !== false,
        settingsText: SETTINGS_TEXT[getStoredLanguage()] || SETTINGS_TEXT.zh,
        editText: EDIT_TEXT[getStoredLanguage()] || EDIT_TEXT.zh,
        nicknameDraft: '',
        avatarDraft: '',
        savingProfile: false
    },

    applyLanguage(language, currentCountry = this.data.currentCountry, bookmarksCount = this.data.bookmarks.length, isLogin = this.data.isLogin) {
        const nextLanguage = normalizeLanguage(language);
        const currentCountryLabel = getCountryName(currentCountry, nextLanguage);
        this.setData({
            language: nextLanguage,
            currentCountryLabel,
            uiText: buildProfileText(nextLanguage, currentCountry, currentCountryLabel, bookmarksCount, isLogin),
            settingsText: SETTINGS_TEXT[nextLanguage] || SETTINGS_TEXT.zh,
            editText: EDIT_TEXT[nextLanguage] || EDIT_TEXT.zh
        });
    },

    onShow() {
        this.refreshProfile();
    },

    onNicknameInput(event) {
        const value = event && event.detail ? event.detail.value : '';
        this.setData({ nicknameDraft: String(value || '') });
    },

    onChooseAvatar(event) {
        const tempUrl = event && event.detail ? event.detail.avatarUrl : '';
        if (tempUrl) {
            // 只拿到本地临时路径，需要点"保存资料"时才上传，避免误触就产生垃圾文件
            this.setData({ avatarDraft: tempUrl });
        }
    },

    async onSaveProfile() {
        const text = this.data.editText || EDIT_TEXT.zh;
        const nickName = String(this.data.nicknameDraft || '').trim();
        if (!nickName) {
            wx.showToast({ title: text.needName, icon: 'none' });
            return;
        }
        this.setData({ savingProfile: true });
        wx.showLoading({ title: text.saving, mask: true });
        try {
            let avatarUrl = (this.data.userInfo && this.data.userInfo.avatarUrl) || '';
            if (this.data.avatarDraft && this.data.avatarDraft !== avatarUrl) {
                avatarUrl = await uploadAvatar(this.data.avatarDraft);
            }
            await updateMyProfile({ nickName, avatarUrl });
            wx.hideLoading();
            this.setData({ avatarDraft: '' });
            await this.refreshProfile();
            wx.showToast({ title: text.saved, icon: 'success' });
        } catch (error) {
            wx.hideLoading();
            console.error('profile: save profile failed', error);
            wx.showToast({ title: error.message || text.failed, icon: 'none' });
        } finally {
            this.setData({ savingProfile: false });
        }
    },

    async onLoginTap() {
        if (this.data.isLogin) {
            return;
        }
        const text = LOGIN_TEXT[this.data.language] || LOGIN_TEXT.zh;
        wx.showLoading({ title: text.loading, mask: true });
        try {
            await syncWeChatLogin();
            await this.refreshProfile();
            wx.hideLoading();
            wx.showToast({ title: text.success, icon: 'success' });
        } catch (error) {
            wx.hideLoading();
            console.error('profile: login failed', error);
            wx.showToast({ title: error.message || text.failed, icon: 'none' });
        }
    },

    async refreshProfile() {
        const currentUser = getStoredCurrentUser();
        const userInfo = currentUser || null;
        const selectedDestination = wx.getStorageSync('selectedDestination') || {};
        const currentCountry = selectedDestination.zhName || '肯尼亚';
        const currentCity = COUNTRY_CITY_MAP[currentCountry] || '主要城市';
        let bookmarks = [];
        const memberSince = this.ensureMemberSince();
        const isLogin = isLoggedIn(currentUser);
        const isAdmin = isAdminUser(currentUser);
        const currentCountryLabel = getCountryName(currentCountry, this.data.language);

        if (isLogin) {
            try {
                const remoteBookmarks = await loadBookmarks();
                bookmarks = this.normalizeBookmarks(remoteBookmarks);
            } catch (error) {
                console.error('profile: load personal data failed', error);
            }
        }

        this.applyLanguage(this.data.language, currentCountry, bookmarks.length, isLogin);
        this.setData({
            isLogin,
            isAdmin,
            currentUser,
            userInfo: userInfo || {},
            nicknameDraft: (userInfo && userInfo.nickName) || '',
            currentCountry,
            currentCity,
            currentCountryLabel,
            destinationInsight: this.data.uiText.destinationInsight,
            focusLabel: this.data.uiText.focusLabel,
            riskLabel: this.data.uiText.riskLabel,
            memberSince,
            bookmarks,
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
            date: item.date || (item.createTime ? String(item.createTime).slice(0, 10) : '最近加入'),
            category: item.category || item.resourceType || item.type || '旅途清单'
        }));
    },

    buildProfileStats(bookmarksCount, isLogin, currentCountry) {
        const text = buildProfileText(this.data.language, currentCountry, this.data.currentCountryLabel, bookmarksCount, isLogin);
        return text.profileStats;
    },

    onToggleSettings() {
        this.setData({ settingsVisible: !this.data.settingsVisible });
    },

    onBookmarkTap(e) {
        const { title } = e.currentTarget.dataset;
        wx.showToast({
            title: title || (this.data.language === 'zh' ? '已打开收藏' : this.data.language === 'en' ? 'Bookmark opened' : 'Favori ouvert'),
            icon: 'none'
        });
    },

    async onRemoveBookmark(e) {
        const { id } = e.currentTarget.dataset;
        try {
            await removeBookmark(id);
            const bookmarks = this.data.bookmarks.filter((bookmark) => String(bookmark.id) !== String(id));
            this.setData({
                bookmarks,
                profileStats: this.buildProfileStats(bookmarks.length, this.data.isLogin, this.data.currentCountry)
            });
            wx.showToast({
                title: this.data.language === 'zh' ? '已移出收藏' : this.data.language === 'en' ? 'Removed from bookmarks' : 'Retiré des favoris',
                icon: 'success'
            });
        } catch (error) {
            wx.showToast({ title: '移除失败，请稍后重试', icon: 'none' });
        }
    },

    onLanguageChange(e) {
        const languageIndex = Number(e.detail.value || 0);
        const language = LANGUAGE_OPTIONS[languageIndex] ? LANGUAGE_OPTIONS[languageIndex].code : 'zh';
        setStoredLanguage(language);
        this.setData({ languageIndex });
        this.applyLanguage(language);
        this.refreshProfile();
    },

    onReminderChange(e) {
        const remindersEnabled = Boolean(e.detail.value);
        wx.setStorageSync(REMINDER_STORAGE_KEY, remindersEnabled);
        this.setData({ remindersEnabled });
    },

    onPrivacyTap() {
        wx.showModal({
            title: '隐私与数据',
            content: '本地保存语言、目的地、离线包和登录会话。服务端保存账号、行程与费用、收藏、动态、评论、消息、服务意向和纠错记录；身份和权限以服务端记录为准。你可以在此删除账号及关联数据。',
            showCancel: false
        });
    },

    onDeleteAccount() {
        wx.showModal({
            title: '删除账号及数据',
            content: '将永久删除账号、行程、费用、复盘、动态、评论、点赞、收藏、消息、服务意向、纠错和登录会话，且无法恢复。本机离线包需另行清理。确认继续吗？',
            confirmText: '永久删除',
            confirmColor: '#c2415d',
            success: async (result) => {
                if (!result.confirm) return;
                try {
                    await deleteCurrentAccount();
                    this.setData({ settingsVisible: false });
                    await this.refreshProfile();
                    wx.showToast({ title: '账号已删除', icon: 'success' });
                } catch (error) {
                    wx.showToast({ title: error.message || '删除失败', icon: 'none' });
                }
            }
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
        if (!url) return;

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
