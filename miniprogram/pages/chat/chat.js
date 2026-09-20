import { getStoredCurrentUser, isLoggedIn, sendChatMessage } from '../../utils/cloud-service.js';
import { getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';
import { ElephantRenderer } from '../../utils/elephant-renderer.js';

const HISTORY_KEY = 'elephantChatHistory';
const MAX_HISTORY = 40;
const CONTEXT_MESSAGES = 12;

const CHAT_TEXT = {
  zh: {
    title: '小象向导',
    subtitle: '非洲象 · 你的旅途伙伴',
    placeholder: '问问小象…',
    send: '发送',
    thinking: '小象正在想…',
    clear: '清空',
    empty: '和小象打个招呼吧',
    loginRequired: '登录后就能和小象聊天了',
    goLogin: '去登录',
    failed: '小象没听清，请再说一次',
    quick: ['去肯尼亚要注意什么？', '内罗毕哪些区域更安全？', '帮我列一份行前清单', '斯瓦希里语怎么道谢？']
  },
  en: {
    title: 'Little Elephant',
    subtitle: 'An African elephant guide',
    placeholder: 'Ask the elephant…',
    send: 'Send',
    thinking: 'Thinking…',
    clear: 'Clear',
    empty: 'Say hello to the elephant',
    loginRequired: 'Sign in to chat with the elephant',
    goLogin: 'Sign in',
    failed: 'The elephant did not catch that, please retry',
    quick: ['What should I know before Kenya?', 'Which areas of Nairobi are safer?', 'Draft a pre-trip checklist', 'How do I say thank you in Swahili?']
  },
  fr: {
    title: 'Petit Éléphant',
    subtitle: 'Un éléphant d’Afrique guide',
    placeholder: 'Demandez à l’éléphant…',
    send: 'Envoyer',
    thinking: 'Réflexion…',
    clear: 'Effacer',
    empty: 'Dites bonjour à l’éléphant',
    loginRequired: 'Connectez-vous pour discuter avec l’éléphant',
    goLogin: 'Se connecter',
    failed: 'L’éléphant n’a pas compris, réessayez',
    quick: ['Que savoir avant le Kenya ?', 'Quels quartiers de Nairobi sont plus sûrs ?', 'Prépare une liste avant départ', 'Comment dire merci en swahili ?']
  }
};

Page({
  data: {
    language: getStoredLanguage(),
    text: CHAT_TEXT.zh,
    statusBarHeight: 20,
    isLogin: false,
    messages: [],
    draft: '',
    sending: false,
    scrollTo: ''
  },

  onLoad() {
    const language = normalizeLanguage(getStoredLanguage());
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      language,
      text: CHAT_TEXT[language] || CHAT_TEXT.zh,
      statusBarHeight: info.statusBarHeight || 20,
      isLogin: isLoggedIn(getStoredCurrentUser()),
      messages: this.loadHistory()
    });
    this.scrollToBottom();
  },

  onShow() {
    this.setData({ isLogin: isLoggedIn(getStoredCurrentUser()) });
  },

  onReady() {
    this.initElephant();
  },

  onUnload() {
    if (this.elephantRenderer) {
      this.elephantRenderer.stop();
      this.elephantRenderer = null;
    }
  },

  initElephant() {
    wx.createSelectorQuery().select('#chat-elephant').node((res) => {
      if (!res || !res.node) {
        return;
      }
      try {
        const canvas = res.node;
        const context = canvas.getContext('2d');
        if (!context) {
          return;
        }
        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = info.pixelRatio || 1;
        canvas.width = 64 * dpr;
        canvas.height = 64 * dpr;
        context.scale(dpr, dpr);
        const renderer = new ElephantRenderer(canvas, context);
        renderer.setState('idle');
        renderer.start();
        this.elephantRenderer = renderer;
      } catch (error) {
        console.error('chat: elephant renderer init failed', error);
      }
    }).exec();
  },

  loadHistory() {
    try {
      const stored = wx.getStorageSync(HISTORY_KEY);
      return Array.isArray(stored) ? stored.slice(-MAX_HISTORY) : [];
    } catch (error) {
      return [];
    }
  },

  saveHistory(messages) {
    try {
      wx.setStorageSync(HISTORY_KEY, messages.slice(-MAX_HISTORY));
    } catch (error) {
      console.warn('chat: save history failed', error);
    }
  },

  scrollToBottom() {
    const messages = this.data.messages;
    if (!messages.length) {
      return;
    }
    this.setData({ scrollTo: `msg-${messages.length - 1}` });
  },

  onBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  },

  onInput(event) {
    this.setData({ draft: (event.detail && event.detail.value) || '' });
  },

  onQuickAsk(event) {
    const question = event.currentTarget.dataset.text || '';
    if (!question) {
      return;
    }
    this.setData({ draft: question });
    this.onSend();
  },

  onClear() {
    wx.showModal({
      title: this.data.text.clear,
      content: this.data.text.empty,
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        this.setData({ messages: [] });
        this.saveHistory([]);
      }
    });
  },

  onGoLogin() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  async onSend() {
    const text = this.data.text;
    const content = String(this.data.draft || '').trim();
    if (!content || this.data.sending) {
      return;
    }
    if (!isLoggedIn(getStoredCurrentUser())) {
      wx.showToast({ title: text.loginRequired, icon: 'none' });
      return;
    }

    const withUser = this.data.messages.concat([{ role: 'user', content, id: Date.now() }]);
    this.setData({ messages: withUser, draft: '', sending: true });
    this.saveHistory(withUser);
    this.scrollToBottom();
    if (this.elephantRenderer) {
      this.elephantRenderer.setState('peek');
    }

    try {
      const context = withUser
        .slice(-CONTEXT_MESSAGES)
        .map((item) => ({ role: item.role, content: item.content }));
      const result = await sendChatMessage(context);
      const withReply = this.data.messages.concat([{
        role: 'assistant',
        content: result.reply,
        id: Date.now() + 1
      }]);
      this.setData({ messages: withReply, sending: false });
      this.saveHistory(withReply);
      this.scrollToBottom();
      if (this.elephantRenderer) {
        this.elephantRenderer.setState('speaking');
        setTimeout(() => {
          if (this.elephantRenderer) {
            this.elephantRenderer.setState('idle');
          }
        }, 1600);
      }
    } catch (error) {
      console.error('chat: send failed', error);
      this.setData({ sending: false });
      if (this.elephantRenderer) {
        this.elephantRenderer.setState('idle');
      }
      wx.showToast({ title: error.message || text.failed, icon: 'none' });
    }
  }
});
