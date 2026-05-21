import { buildCommunityText, getStoredLanguage } from '../../utils/i18n.js';
import { getCloudDatabase, loadCollectionWithFallback } from '../../utils/cloud-service.js';

const STATS = [
  { id: 1, value: '24.8K', label: '精选动态' },
  { id: 2, value: '5.6K', label: '旅人收藏' },
  { id: 3, value: '912', label: '灵感路线' }
];

const AVATARS = [
  { id: 1, name: 'Lina', initials: 'LI', tone: 'tone-mint' },
  { id: 2, name: 'Ayo', initials: 'AY', tone: 'tone-champagne' },
  { id: 3, name: 'Nia', initials: 'NI', tone: 'tone-peach' },
  { id: 4, name: 'Kofi', initials: 'KF', tone: 'tone-sky' },
  { id: 5, name: 'Maya', initials: 'MY', tone: 'tone-blush' }
];

const FEATURED_POST = {
  author: 'Amani Studio',
  role: '柔光旅行编录',
  time: '3 分钟阅读',
  title: '柔和日照落进非洲河岸，风景与故事都慢了下来',
  body: '把首页的薄荷晨雾与发布页的暖金余晖接在一起，社区页就像一层会呼吸的轻雾背景。前景只保留干净的亚克力白卡片，让故事、照片和旅行线索以更从容的节奏被看见。',
  image: '/assets/images/congo-drc.png',
  tags: ['柔光河岸', '香槟余晖', '轻盈社区'],
  location: 'African river bend',
  light: 'Soft light journal',
  likesText: '12.8K',
  baseLikesText: '12.8K',
  likedLikesText: '12.9K',
  commentsText: '286',
  savesText: '1.4K',
  isLiked: false
};

Page({
  data: {
    activeTab: 'community',
    language: getStoredLanguage(),
    welcomeCountryZh: '肯尼亚',
    uiText: buildCommunityText(getStoredLanguage(), '肯尼亚'),
    subtitle: 'Soft Blend Community Feed',
    description: '承接首页的薄荷清晨，过渡到发布页的香槟暖光，这里把旅途故事安放在更轻、更高级的社区流里。',
    journeyNote: '从首页的 mint 晨光，缓缓过渡到发布页的 champagne 暖色',
    stats: STATS,
    avatars: AVATARS,
    featuredPost: FEATURED_POST
  },

  onLoad() {
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#eef8f3',
      animation: {
        duration: 180,
        timingFunc: 'easeIn'
      }
    });
  },

  onShow() {
    this.refreshCommunityFeed();
  },

  async refreshCommunityFeed() {
    const db = getCloudDatabase();
    if (!db) {
      return;
    }

    try {
      const result = await db.collection('posts').orderBy('createTime', 'desc').limit(1).get();
      const latest = result.data && result.data[0];
      if (!latest) {
        return;
      }

      const cloudImage = await this.resolveCloudImage(latest.mediaFileIds || []);
      this.setData({
        featuredPost: {
          ...this.data.featuredPost,
          author: latest.authorName || this.data.featuredPost.author,
          role: latest.authorRole === 'admin' ? '管理员发布' : '云端旅人',
          time: '云端同步',
          title: latest.content ? latest.content.slice(0, 28) : this.data.featuredPost.title,
          body: latest.content || this.data.featuredPost.body,
          image: cloudImage || this.data.featuredPost.image,
          tags: ['云端动态', latest.sourcePage || 'posts'],
          location: latest.destinationLabel || 'Cloud feed',
          light: 'Cloud post',
          likesText: this.data.featuredPost.likesText,
          baseLikesText: this.data.featuredPost.baseLikesText,
          likedLikesText: this.data.featuredPost.likedLikesText,
          commentsText: this.data.featuredPost.commentsText,
          savesText: this.data.featuredPost.savesText,
          isLiked: false
        }
      });
    } catch (error) {
      console.warn('community: load posts failed', error);
    }
  },

  async resolveCloudImage(fileIds) {
    if (!Array.isArray(fileIds) || !fileIds.length || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
      return '';
    }

    try {
      const result = await wx.cloud.getTempFileURL({
        fileList: [fileIds[0]]
      });
      const file = result.fileList && result.fileList[0];
      return file && file.tempFileURL ? file.tempFileURL : '';
    } catch (error) {
      return '';
    }
  },

  onShow() {
    const cached = wx.getStorageSync('selectedDestination');
    if (!cached || !cached.zhName) {
      return;
    }

    this.setData({
      welcomeCountryZh: cached.zhName
    });
  },

  onComposeTap() {
    wx.switchTab({
      url: '/pages/publish/publish',
      fail: () => {
        wx.showToast({
          title: this.data.language === 'zh' ? '打开发布页失败' : this.data.language === 'en' ? 'Failed to open publish page' : 'Échec de l’ouverture de la page de publication',
          icon: 'none'
        });
      }
    });
  },

  onAvatarTap(e) {
    const { name } = e.currentTarget.dataset;
    wx.showToast({
      title: this.data.language === 'zh' ? `查看 ${name} 的旅程` : this.data.language === 'en' ? `View ${name}'s journey` : `Voir le parcours de ${name}`,
      icon: 'none'
    });
  },

  onTagTap(e) {
    const { tag } = e.currentTarget.dataset;
    wx.showToast({
      title: this.data.language === 'zh' ? `${tag} 筛选开发中` : this.data.language === 'en' ? `Filtering by ${tag} coming soon` : `Filtre ${tag} bientôt disponible`,
      icon: 'none'
    });
  },

  onLikeTap() {
    const { featuredPost } = this.data;
    const isLiked = !featuredPost.isLiked;

    this.setData({
      'featuredPost.isLiked': isLiked,
      'featuredPost.likesText': isLiked ? featuredPost.likedLikesText : featuredPost.baseLikesText
    });
  },

  onActionTap(e) {
    const { action } = e.currentTarget.dataset;
    const actionText = this.data.uiText.actionTexts || {};

    wx.showToast({
      title: this.data.language === 'zh'
        ? `${actionText[action] || '打开'}功能开发中`
        : this.data.language === 'en'
          ? `${actionText[action] || 'Open'} feature coming soon`
          : `Fonction ${actionText[action] || 'ouvrir'} bientôt disponible`,
      icon: 'none'
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

    wx.switchTab({
      url,
      fail: () => {
        wx.showToast({
          title: this.data.language === 'zh' ? '跳转失败，请稍后重试' : this.data.language === 'en' ? 'Navigation failed, please try again' : 'Échec de navigation, réessayez',
          icon: 'none'
        });
      }
    });
  }
});
