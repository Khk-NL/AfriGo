import { createPost, getStoredCurrentUser, isLoggedIn } from '../../utils/cloud-service.js';

const MAX_MEDIA_COUNT = 4;

function createMediaSlots(mediaList) {
    const list = mediaList || [];

    return Array.from({ length: MAX_MEDIA_COUNT }, (_, index) => {
        const media = list[index];

        if (media) {
            return {
                id: index + 1,
                isFilled: true,
                image: media.tempFilePath
            };
        }

        return {
            id: index + 1,
            isFilled: false,
            label: index === list.length ? '添加照片' : '保留框位',
            hint: index === list.length ? '点击上传' : '预留版面'
        };
    });
}

Page({
    data: {
        activeTab: 'publish',
        content: '',
        mediaList: [],
        mediaSlots: createMediaSlots([]),
        currentUser: null,
        isLogin: false
    },

    onLoad() {
        wx.setNavigationBarColor({
            frontColor: '#000000',
            backgroundColor: '#fff6ed',
            animation: {
                duration: 180,
                timingFunc: 'easeIn'
            }
        });

        this.refreshAuthState();
    },

    onShow() {
        this.refreshAuthState();
    },

    refreshAuthState() {
        const currentUser = getStoredCurrentUser();
        this.setData({
            currentUser,
            isLogin: isLoggedIn(currentUser)
        });
    },

    onContentInput(e) {
        this.setData({
            content: e.detail.value
        });
    },

    onUploadTap() {
        const remaining = MAX_MEDIA_COUNT - this.data.mediaList.length;

        if (remaining <= 0) {
            wx.showToast({
                title: '最多上传4张照片',
                icon: 'none'
            });
            return;
        }

        wx.chooseMedia({
            count: remaining,
            mediaType: ['image'],
            sizeType: ['compressed'],
            success: (res) => {
                const nextMediaList = this.data.mediaList
                    .concat(res.tempFiles.map((file) => ({ tempFilePath: file.tempFilePath })))
                    .slice(0, MAX_MEDIA_COUNT);

                this.setData({
                    mediaList: nextMediaList,
                    mediaSlots: createMediaSlots(nextMediaList)
                });
            }
        });
    },

    onRemoveMedia(e) {
        const { index } = e.currentTarget.dataset;
        const nextMediaList = this.data.mediaList.filter((_, mediaIndex) => mediaIndex !== index);

        this.setData({
            mediaList: nextMediaList,
            mediaSlots: createMediaSlots(nextMediaList)
        });
    },

    async onPublishTap() {
        if (!this.data.isLogin) {
            wx.showToast({
                title: '请先在欢迎页登录',
                icon: 'none'
            });
            return;
        }

        if (!this.data.content.trim() && !this.data.mediaList.length) {
            wx.showToast({
                title: 'Add text or photos first',
                icon: 'none'
            });
            return;
        }

        try {
            await createPost({
                content: this.data.content,
                mediaList: this.data.mediaList,
                extra: {
                    sourcePage: 'publish'
                }
            });

            this.setData({
                content: '',
                mediaList: [],
                mediaSlots: createMediaSlots([])
            });

            wx.showToast({
                title: '发布成功',
                icon: 'success'
            });
        } catch (error) {
            console.error('publish: create post failed', error);
            wx.showToast({
                title: '发布失败，请稍后重试',
                icon: 'none'
            });
        }
    },

    onSOSTap() {
        wx.navigateTo({
            url: '/pages/security/security'
        });
    },

    onTabTap(e) {
        const tab = e.currentTarget.dataset.tab;
        if (tab === this.data.activeTab) {
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
            return;
        }

        wx.switchTab({ url });
    }
});