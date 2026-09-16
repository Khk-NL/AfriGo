import { buildCommunityText, getStoredLanguage } from '../../utils/i18n.js';
import { addBookmark, createPostComment, loadCollection, loadPostComments, loadPostEngagement, togglePostLike } from '../../utils/cloud-service.js';
import { normalizeCountryCode } from '../../utils/countries.js';

const STATS = [
  { id: 1, value: '0', label: '社区动态' },
  { id: 2, value: '0', label: '获得点赞' },
  { id: 3, value: '0', label: '旅行讨论' }
];

const FEATURED_POST = {
  id: '',
  author: '非常行社区',
  role: '社区提示',
  time: '',
  title: '还没有社区动态',
  body: '发布第一条旅行见闻、图片或当地提醒，内容会显示在这里。',
  image: '/assets/images/covers/kenya.jpg',
  tags: ['社区动态'],
  location: '等待第一条分享',
  light: '',
  likesText: '0',
  commentsText: '0',
  savesText: '收藏',
  isLiked: false,
  isSaved: false
};

function formatCount(value) {
  const count = Number(value || 0);
  if (count >= 10000) return `${(count / 10000).toFixed(1)}W`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

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
    avatars: [],
    featuredPost: FEATURED_POST,
    allFeedPosts: [],
    feedPosts: [],
    activeTag: '',
    totalLikes: 0,
    totalComments: 0,
    isLiking: false,
    isLoading: false,
    loadError: ''
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
    const cached = wx.getStorageSync('selectedDestination');
    const welcomeCountryZh = cached && cached.zhName ? cached.zhName : '肯尼亚';
    const language = getStoredLanguage();
    this.setData({
      language,
      welcomeCountryZh,
      uiText: buildCommunityText(language, welcomeCountryZh)
    });
    this.refreshCommunityFeed();
  },

  async refreshCommunityFeed() {
    this.setData({ isLoading: true, loadError: '' });
    try {
      const posts = await loadCollection('posts');
      const normalizedPosts = posts.map((post) => {
        const firstMedia = Array.isArray(post.mediaFileIds) ? post.mediaFileIds[0] : null;
        const image = typeof firstMedia === 'string' ? firstMedia : firstMedia && firstMedia.url;
        return {
          ...post,
          image: image || '',
          displayTime: post.createTime ? String(post.createTime).slice(0, 16).replace('T', ' ') : '刚刚',
          roleLabel: post.authorRole === 'admin' ? '管理员发布' : '旅行者',
          tags: ['社区动态', post.destinationLabel].filter(Boolean),
          likesText: formatCount(post.likeCount),
          commentsText: formatCount(post.commentCount),
          savesText: '收藏',
          isLiked: false,
          isSaved: false
        };
      });
      const latest = normalizedPosts[0];
      const feedPosts = latest ? normalizedPosts.slice(1) : [];
      const tones = ['tone-mint', 'tone-champagne', 'tone-peach', 'tone-sky', 'tone-blush'];
      const avatars = [...new Map(normalizedPosts.map((post) => [post.authorName || '微信用户', post])).values()]
        .slice(0, 5)
        .map((post, index) => {
          const name = post.authorName || '微信用户';
          return { id: post.authorOpenid || name, name, initials: name.slice(0, 2).toUpperCase(), tone: tones[index] };
        });
      const totalLikes = normalizedPosts.reduce((sum, post) => sum + Number(post.likeCount || 0), 0);
      const totalComments = normalizedPosts.reduce((sum, post) => sum + Number(post.commentCount || 0), 0);
      let engagement = {};
      if (latest) {
        try {
          engagement = await loadPostEngagement(latest.id);
        } catch (error) {
          engagement = {};
        }
      }
      this.setData({
        allFeedPosts: feedPosts,
        feedPosts,
        activeTag: '',
        avatars,
        totalLikes,
        totalComments,
        stats: [
          { id: 1, value: String(normalizedPosts.length), label: '社区动态' },
          { id: 2, value: formatCount(totalLikes), label: '获得点赞' },
          { id: 3, value: formatCount(totalComments), label: '旅行讨论' }
        ],
        featuredPost: latest ? {
          ...this.data.featuredPost,
          ...latest,
          author: latest.authorName || this.data.featuredPost.author,
          role: latest.roleLabel,
          time: latest.displayTime,
          title: latest.content ? latest.content.slice(0, 28) : '图片动态',
          body: latest.content || '分享了一组旅途照片',
          image: latest.image || this.data.featuredPost.image,
          tags: latest.tags,
          location: latest.destinationLabel || this.data.welcomeCountryZh,
          light: 'Live post',
          isLiked: Boolean(engagement.isLiked),
          isSaved: Boolean(engagement.isSaved),
          savesText: engagement.isSaved ? '已收藏' : '收藏'
        } : FEATURED_POST,
        isLoading: false
      });
    } catch (error) {
      console.error('community: load posts failed', error);
      this.setData({
        isLoading: false,
        loadError: '社区动态加载失败，请稍后重试'
      });
    }
  },

  onRetryTap() {
    this.refreshCommunityFeed();
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
    const activeTag = this.data.activeTag === tag ? '' : tag;
    const feedPosts = activeTag
      ? this.data.allFeedPosts.filter((post) => (post.tags || []).includes(activeTag))
      : this.data.allFeedPosts;
    this.setData({ activeTag, feedPosts });
  },

  async onLikeTap() {
    const { featuredPost } = this.data;
    if (this.data.isLiking) return;
    if (!featuredPost.id) {
      wx.showToast({ title: '暂无可互动的社区动态', icon: 'none' });
      return;
    }
    try {
      this.setData({ isLiking: true });
      const result = await togglePostLike(featuredPost.id);
      const totalLikes = Math.max(0, this.data.totalLikes + Number(result.likeCount || 0) - Number(featuredPost.likeCount || 0));
      this.setData({
        'featuredPost.isLiked': result.isLiked,
        'featuredPost.likeCount': Number(result.likeCount || 0),
        'featuredPost.likesText': formatCount(result.likeCount),
        totalLikes,
        stats: this.data.stats.map((item) => item.id === 2 ? { ...item, value: formatCount(totalLikes) } : item)
      });
    } catch (error) {
      wx.showToast({ title: error.message || '请先登录后点赞', icon: 'none' });
    } finally {
      this.setData({ isLiking: false });
    }
  },

  async onActionTap(e) {
    const { action } = e.currentTarget.dataset;
    const post = this.data.featuredPost;
    if (!post.id) {
      wx.showToast({ title: '暂无可互动的社区动态', icon: 'none' });
      return;
    }
    if (action === 'comment') {
      try {
        const comments = await loadPostComments(post.id);
        const actions = comments.length ? ['发表评论', '查看最新评论'] : ['发表评论'];
        wx.showActionSheet({
          itemList: actions,
          success: (result) => {
            if (result.tapIndex === 0) this.openCommentComposer(post);
            if (result.tapIndex === 1) {
              const preview = comments.slice(-8).map((item) => `${item.authorName}：${item.content}`).join('\n\n');
              wx.showModal({ title: '最新评论', content: preview, showCancel: false });
            }
          }
        });
      } catch (error) {
        wx.showToast({ title: error.message || '评论加载失败', icon: 'none' });
      }
      return;
    }
    if (action === 'save') {
      try {
        const selected = wx.getStorageSync('selectedDestination') || {};
        await addBookmark({
          resourceType: 'post',
          resourceId: String(post.id),
          title: post.title || String(post.body || '社区动态').slice(0, 30),
          category: '社区动态',
          countryCode: normalizeCountryCode(selected.code, selected.zhName),
          payload: { content: post.body, image: post.image, authorName: post.author }
        });
        this.setData({ 'featuredPost.isSaved': true, 'featuredPost.savesText': '已收藏' });
        wx.showToast({ title: '已收藏', icon: 'success' });
      } catch (error) {
        wx.showToast({ title: error.message || '请先登录后收藏', icon: 'none' });
      }
    }
  },

  openCommentComposer(post) {
    wx.showModal({
      title: `发表评论（已有 ${post.commentsText} 条）`,
      editable: true,
      placeholderText: '输入 1-500 个字符',
      success: async (result) => {
        const content = String(result.content || '').trim();
        if (!result.confirm || !content) return;
        try {
          await createPostComment(post.id, content);
          const nextCount = Number(post.commentCount || 0) + 1;
          const totalComments = this.data.totalComments + 1;
          this.setData({
            'featuredPost.commentCount': nextCount,
            'featuredPost.commentsText': formatCount(nextCount),
            totalComments,
            stats: this.data.stats.map((item) => item.id === 3 ? { ...item, value: formatCount(totalComments) } : item)
          });
          wx.showToast({ title: '评论已发布', icon: 'success' });
        } catch (error) {
          wx.showToast({ title: error.message || '评论失败', icon: 'none' });
        }
      }
    });
  },

  onShareAppMessage() {
    const post = this.data.featuredPost;
    return {
      title: post.title || `${this.data.welcomeCountryZh}旅行动态`,
      path: '/pages/community/community',
      imageUrl: post.image || undefined
    };
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
