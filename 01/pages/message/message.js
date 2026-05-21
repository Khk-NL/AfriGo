import { buildMessageText, getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';

Page({
    data: {
        language: getStoredLanguage(),
        uiText: buildMessageText(getStoredLanguage()),
        notices: []
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

    // Removed onBackTap as this is a tab bar page

    // Click to mark message as read
    readNotice(e) {
        const id = e.currentTarget.dataset.id;
        let list = this.data.notices;
        list.forEach(item => {
            if (item.id === id) item.unread = false;
        });
        this.setData({ notices: list });

        wx.showToast({
            title: this.data.uiText.unreadToast,
            icon: 'none'
        });
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