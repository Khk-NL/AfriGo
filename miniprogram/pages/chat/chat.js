import { getStoredCurrentUser, isLoggedIn } from '../../utils/cloud-service.js';
import { getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';
import { getSelectedDestination } from '../../utils/countries.js';
import { getWindowMetrics, mountElephant, rpxToPx } from '../../utils/elephant-canvas.js';
import {
  ELEPHANT_CHAT_TEXT,
  askElephant,
  clearElephantHistory,
  loadElephantHistory,
  saveElephantHistory
} from '../../utils/elephant-chat.js';

const ELEPHANT_SIZE_RPX = 176;

Page({
  data: {
    language: getStoredLanguage(),
    text: ELEPHANT_CHAT_TEXT.zh,
    statusBarHeight: 20,
    isLogin: false,
    messages: [],
    draft: '',
    sending: false,
    scrollTo: '',
    countryCode: '',
    countryZh: '',
    elephantSize: 88
  },

  onLoad() {
    const metrics = getWindowMetrics();
    const language = normalizeLanguage(getStoredLanguage());
    const destination = getSelectedDestination();
    this.setData({
      language,
      text: ELEPHANT_CHAT_TEXT[language] || ELEPHANT_CHAT_TEXT.zh,
      statusBarHeight: metrics.statusBarHeight,
      isLogin: isLoggedIn(getStoredCurrentUser()),
      countryCode: destination.code || '',
      countryZh: destination.zhName || '',
      elephantSize: Math.round(rpxToPx(ELEPHANT_SIZE_RPX, metrics.windowWidth)),
      messages: loadElephantHistory()
    });
    this.scrollToBottom();
  },

  onShow() {
    this.setData({ isLogin: isLoggedIn(getStoredCurrentUser()) });
    if (this.elephantRenderer && !this.elephantRenderer.animId) {
      this.elephantRenderer.start();
    }
  },

  onHide() {
    if (this.elephantRenderer) {
      this.elephantRenderer.stop();
    }
  },

  onReady() {
    mountElephant('#chat-elephant', {
      size: this.data.elephantSize,
      state: 'idle',
      frameIntervalMs: 33
    }).then((renderer) => {
      this.elephantRenderer = renderer;
    });
  },

  onUnload() {
    if (this.elephantRenderer) {
      this.elephantRenderer.stop();
      this.elephantRenderer = null;
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
      content: this.data.text.clearConfirm,
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        clearElephantHistory();
        this.setData({ messages: [] });
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
    saveElephantHistory(withUser);
    this.scrollToBottom();
    if (this.elephantRenderer) {
      this.elephantRenderer.setState('peek');
    }

    try {
      const result = await askElephant(withUser);
      const withReply = this.data.messages.concat([{
        role: 'assistant',
        content: result.reply,
        id: Date.now() + 1
      }]);
      this.setData({ messages: withReply, sending: false });
      saveElephantHistory(withReply);
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
