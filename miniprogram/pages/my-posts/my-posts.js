import { deleteMyPost, getStoredCurrentUser, isLoggedIn, loadMyPosts } from '../../utils/cloud-service.js';
import { getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';

const TEXT = {
  zh: {
    eyebrow: 'MY POSTS',
    title: '我的动态',
    summary: '这里只放你自己发布的社区内容，删除后无法恢复。',
    emptyTitle: '还没有发布动态',
    emptyDesc: '去社区发布第一条旅行见闻或当地提醒吧。',
    loginRequired: '登录后才能查看自己的动态',
    goLogin: '去登录',
    delete: '删除',
    deleteTitle: '删除动态',
    deleteConfirm: '确认删除这条动态吗？',
    deleted: '已删除',
    deleteFailed: '删除失败，请稍后重试',
    failed: '加载失败，请下拉重试',
    imagePost: '图片动态',
    countSuffix: ' 条'
  },
  en: {
    eyebrow: 'MY POSTS',
    title: 'My posts',
    summary: 'Only the posts you published. Deleting one cannot be undone.',
    emptyTitle: 'No posts yet',
    emptyDesc: 'Head to the community and share your first travel note.',
    loginRequired: 'Sign in to see your posts',
    goLogin: 'Sign in',
    delete: 'Delete',
    deleteTitle: 'Delete post',
    deleteConfirm: 'Delete this post?',
    deleted: 'Deleted',
    deleteFailed: 'Delete failed, please retry',
    failed: 'Load failed, pull to retry',
    imagePost: 'Photo post',
    countSuffix: ''
  },
  fr: {
    eyebrow: 'MES PUBLICATIONS',
    title: 'Mes publications',
    summary: 'Uniquement vos publications. La suppression est définitive.',
    emptyTitle: 'Aucune publication',
    emptyDesc: 'Publiez votre premier carnet de voyage dans la communauté.',
    loginRequired: 'Connectez-vous pour voir vos publications',
    goLogin: 'Se connecter',
    delete: 'Supprimer',
    deleteTitle: 'Supprimer la publication',
    deleteConfirm: 'Supprimer cette publication ?',
    deleted: 'Supprimé',
    deleteFailed: 'Échec de la suppression, réessayez',
    failed: 'Échec du chargement, tirez pour réessayer',
    imagePost: 'Publication photo',
    countSuffix: ''
  }
};

Page({
  data: {
    language: getStoredLanguage(),
    text: TEXT.zh,
    isLogin: false,
    loading: true,
    posts: []
  },

  onLoad() {
    const language = normalizeLanguage(getStoredLanguage());
    this.setData({ language, text: TEXT[language] || TEXT.zh });
  },

  onShow() {
    this.refresh();
  },

  async onPullDownRefresh() {
    await this.refresh();
    wx.stopPullDownRefresh();
  },

  async refresh() {
    const isLogin = isLoggedIn(getStoredCurrentUser());
    if (!isLogin) {
      this.setData({ isLogin, loading: false, posts: [] });
      return;
    }
    this.setData({ isLogin, loading: true });
    try {
      const posts = await loadMyPosts();
      this.setData({ loading: false, posts: Array.isArray(posts) ? posts : [] });
    } catch (error) {
      console.error('my-posts: load failed', error);
      this.setData({ loading: false, posts: [] });
      wx.showToast({ title: this.data.text.failed, icon: 'none' });
    }
  },

  onBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.switchTab({ url: '/pages/community/community' });
  },

  onGoLogin() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  onGoCommunity() {
    wx.switchTab({ url: '/pages/community/community' });
  },

  onDeletePost(event) {
    const { id } = event.currentTarget.dataset;
    const text = this.data.text;
    wx.showModal({
      title: text.deleteTitle,
      content: text.deleteConfirm,
      confirmColor: '#b4552f',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        try {
          await deleteMyPost(id);
          this.setData({ posts: this.data.posts.filter((post) => String(post.id) !== String(id)) });
          wx.showToast({ title: text.deleted, icon: 'success' });
        } catch (error) {
          console.error('my-posts: delete failed', error);
          wx.showToast({ title: text.deleteFailed, icon: 'none' });
        }
      }
    });
  }
});
