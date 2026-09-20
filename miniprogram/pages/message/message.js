import { buildMessageText, getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';
import { getStoredCurrentUser, isLoggedIn, loadNotifications, markNotificationRead } from '../../utils/cloud-service.js';

Page({
    data: {
        language: getStoredLanguage(),
        activeTab: 'message',
        uiText: buildMessageText(getStoredLanguage()),
        notices: [],
        unreadCount: 0,
        isLoading: false,
        remindersEnabled: wx.getStorageSync('inAppRemindersEnabled') !== false
    },

    applyLanguage(language) {
        const nextLanguage = normalizeLanguage(language);
        this.setData({
            language: nextLanguage,
            uiText: buildMessageText(nextLanguage)
        });
    },

    onLoad() {
        this.applyLanguage(getStoredLanguage());
    },

    onShow() {
        this.applyLanguage(getStoredLanguage());
        this.setData({ remindersEnabled: wx.getStorageSync('inAppRemindersEnabled') !== false });
        this.refreshNotices();
    },

    async refreshNotices() {
        if (!isLoggedIn(getStoredCurrentUser())) {
            this.setData({ notices: [], unreadCount: 0 });
            return;
        }
        this.setData({ isLoading: true });
        try {
            const notices = await loadNotifications();
            const mapped = notices.map((item) => ({
                ...item,
                // 标签配色跟全站统一，不再用薄荷/靛蓝
                tone: item.type === 'publish' ? 'sage' : 'sand',
                time: item.createTime ? String(item.createTime).slice(0, 16).replace('T', ' ') : ''
            }));
            this.setData({
                notices: mapped,
                unreadCount: mapped.filter((item) => item.unread).length
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
            this.setData({ notices, unreadCount: notices.filter((item) => item.unread).length });
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
