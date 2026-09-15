import { buildMessageText, getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';
import { getStoredCurrentUser, isLoggedIn, loadNotifications, markNotificationRead } from '../../utils/cloud-service.js';

Page({
    data: {
        language: getStoredLanguage(),
        uiText: buildMessageText(getStoredLanguage()),
        notices: [],
        isLoading: false
    },

    applyLanguage(language) {
        const nextLanguage = normalizeLanguage(language);
        const localeText = buildMessageText(nextLanguage);
        this.setData({
            language: nextLanguage,
            uiText: localeText,
            notices: localeText.notices
        });
    },

    onLoad() {
        this.applyLanguage(getStoredLanguage());
    },

    onShow() {
        this.refreshNotices();
    },

    async refreshNotices() {
        if (!isLoggedIn(getStoredCurrentUser())) {
            this.setData({ notices: [] });
            return;
        }
        this.setData({ isLoading: true });
        try {
            const notices = await loadNotifications();
            this.setData({
                notices: notices.map((item) => ({
                    ...item,
                    tagBg: item.type === 'publish' ? '#eef9f2' : '#eef2ff',
                    time: item.createTime ? String(item.createTime).slice(0, 16).replace('T', ' ') : ''
                }))
            });
        } catch (error) {
            console.error('message: load notifications failed', error);
            wx.showToast({ title: '消息加载失败', icon: 'none' });
        } finally {
            this.setData({ isLoading: false });
        }
    },

    // Removed onBackTap as this is a tab bar page

    // Click to mark message as read
    async readNotice(e) {
        const id = e.currentTarget.dataset.id;
        try {
            await markNotificationRead(id);
            const notices = this.data.notices.map((item) => String(item.id) === String(id) ? { ...item, unread: false } : item);
            this.setData({ notices });
            wx.showToast({ title: this.data.uiText.unreadToast, icon: 'none' });
        } catch (error) {
            wx.showToast({ title: '操作失败，请稍后重试', icon: 'none' });
        }
    },

    // Tab bar navigation logic
    onTabTap: function(e) {
        const tab = e.currentTarget.dataset.tab;
        if (tab === 'message') {
            return; // Already on this tab
        }

        let url = '';
        switch (tab) {
            case 'home':
                url = '/pages/home/home';
                break;
            case 'community':
                url = '/pages/community/community';
                break;
            case 'publish':
                url = '/pages/publish/publish';
                break;
            case 'message':
                url = '/pages/message/message';
                break;
            case 'profile':
                url = '/pages/profile/profile';
                break;
            default:
                break;
        }

        if (url) {
            wx.switchTab({
                url: url,
                fail: (res) => {
                    console.error(`Failed to switch tab to ${url}:`, res);
                    wx.navigateTo({
                        url: url,
                        fail: (navRes) => {
                            console.error(`Failed to navigate to ${url}:`, navRes);
                        }
                    });
                }
            });
        }
    }
});
