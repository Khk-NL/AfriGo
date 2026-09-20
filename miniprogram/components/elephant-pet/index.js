import { getStoredCurrentUser, isLoggedIn } from '../../utils/cloud-service.js';
import { getStoredLanguage, normalizeLanguage } from '../../utils/i18n.js';
import { getWindowMetrics, mountElephant, rpxToPx } from '../../utils/elephant-canvas.js';
import {
  ELEPHANT_CHAT_TEXT,
  askElephant,
  clearElephantHistory,
  loadElephantHistory,
  saveElephantHistory
} from '../../utils/elephant-chat.js';

const POSITION_KEY = 'elephantPetPosition';
const DRAG_THRESHOLD_PX = 6;
const PANEL_HEIGHT_RATIO = 0.58;
const EDGE_MARGIN_PX = 4;
const BUBBLE_VISIBLE_MS = 5200;
const BUBBLE_COOLDOWN_MS = 90_000;
const PET_SIZE_RPX = 148;
const DEFAULT_BOTTOM_RESERVE_PX = 84;

// 模块级：一次冷启动内共享。收起只对本次使用生效，重进小程序会重新出现。
let petSuppressed = false;

const PET_TEXT = {
  zh: {
    tips: [
      '点我聊聊你的行程～',
      '签证、疫苗、当地安全都能问我',
      '拖着我能换个位置',
      '长按我可以全屏、换位置或者先躲起来'
    ],
    menuTitle: '和小象有关的操作',
    menuFullScreen: '全屏聊天',
    menuReset: '回到默认位置',
    menuHide: '暂时收起（重开小程序会回来）'
  },
  en: {
    tips: [
      'Tap me to talk about your trip',
      'Ask me about visas, vaccines or local safety',
      'Drag me anywhere on the screen',
      'Long press for full screen or to hide me'
    ],
    menuTitle: 'Elephant options',
    menuFullScreen: 'Full-screen chat',
    menuReset: 'Reset position',
    menuHide: 'Hide for now (returns on restart)'
  },
  fr: {
    tips: [
      'Touchez-moi pour parler de votre voyage',
      'Posez-moi vos questions visa, vaccins, sécurité',
      'Faites-moi glisser où vous voulez',
      'Appui long : plein écran ou me cacher'
    ],
    menuTitle: 'Options de l’éléphant',
    menuFullScreen: 'Discussion plein écran',
    menuReset: 'Réinitialiser la position',
    menuHide: 'Me cacher (revient au redémarrage)'
  }
};

Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    /** 页面可以关掉桌宠（例如纯表单页）。 */
    enabled: { type: Boolean, value: true },
    /** 底部为 tabBar 预留的高度（px）。 */
    reserveBottom: { type: Number, value: DEFAULT_BOTTOM_RESERVE_PX }
  },

  data: {
    language: 'zh',
    text: ELEPHANT_CHAT_TEXT.zh,
    tips: PET_TEXT.zh,
    visible: true,
    isLogin: false,
    size: 66,
    bottomInset: 0,
    x: 0,
    y: 0,
    dragging: false,
    panelOpen: false,
    panelHeight: 380,
    messages: [],
    draft: '',
    sending: false,
    scrollTo: '',
    bubbleShow: false,
    bubbleText: '',
    bubbleStyle: ''
  },

  lifetimes: {
    attached() {
      const language = normalizeLanguage(getStoredLanguage());
      this.metrics = getWindowMetrics();
      this.bottomReserved = (Number(this.data.reserveBottom) || 0) + this.metrics.safeAreaBottom;
      const size = Math.round(rpxToPx(PET_SIZE_RPX, this.metrics.windowWidth));
      const panelHeight = Math.round(this.metrics.windowHeight * PANEL_HEIGHT_RATIO);
      const position = this.resolvePosition(size);
      this.setData({
        language,
        text: ELEPHANT_CHAT_TEXT[language] || ELEPHANT_CHAT_TEXT.zh,
        tips: (PET_TEXT[language] || PET_TEXT.zh),
        visible: !petSuppressed && this.data.enabled,
        isLogin: isLoggedIn(getStoredCurrentUser()),
        size,
        bottomInset: this.metrics.safeAreaBottom,
        panelHeight,
        x: position.x,
        y: position.y,
        messages: loadElephantHistory()
      });
    },

    ready() {
      if (this.data.visible) {
        this.mountRenderer();
      }
    },

    detached() {
      this.teardown();
    }
  },

  pageLifetimes: {
    show() {
      this.setData({ isLogin: isLoggedIn(getStoredCurrentUser()) });
      if (this.data.visible) {
        if (this.renderer && !this.renderer.animId) {
          this.renderer.start();
        }
        this.scheduleBubble();
      }
    },
    hide() {
      if (this.renderer) {
        this.renderer.stop();
      }
      this.clearTimers();
    }
  },

  methods: {
    /** 读取上次的位置；没有记录时停在右侧、屏幕下方四分之一处。 */
    resolvePosition(size) {
      const metrics = this.metrics;
      const maxX = Math.max(0, metrics.windowWidth - size);
      const maxY = Math.max(metrics.statusBarHeight, metrics.windowHeight - size - this.bottomReserved);
      let stored = null;
      try {
        stored = wx.getStorageSync(POSITION_KEY) || null;
      } catch (error) {
        console.warn('elephant: 读取位置失败', error);
      }
      if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
        return {
          x: Math.min(Math.max(0, stored.x), maxX),
          y: Math.min(Math.max(metrics.statusBarHeight, stored.y), maxY)
        };
      }
      return {
        x: maxX - EDGE_MARGIN_PX,
        y: Math.min(maxY, Math.round(metrics.windowHeight * 0.58))
      };
    },

    savePosition() {
      try {
        wx.setStorageSync(POSITION_KEY, { x: this.data.x, y: this.data.y });
      } catch (error) {
        console.warn('elephant: 保存位置失败', error);
      }
    },

    mountRenderer() {
      mountElephant('#pet-canvas', {
        component: this,
        size: this.data.size,
        state: 'peek',
        frameIntervalMs: 33
      }).then((renderer) => {
        if (!renderer) {
          return;
        }
        if (this.renderer) {
          this.renderer.stop();
        }
        this.renderer = renderer;
      });
    },

    setPetState(state) {
      if (this.renderer) {
        this.renderer.setState(state);
      }
    },

    teardown() {
      this.clearTimers();
      if (this.renderer) {
        this.renderer.stop();
        this.renderer = null;
      }
    },

    clearTimers() {
      clearTimeout(this.bubbleTimer);
      clearTimeout(this.stateTimer);
      this.bubbleTimer = null;
      this.stateTimer = null;
    },

    scheduleBubble() {
      const now = Date.now();
      if (this.data.panelOpen || now - (this.lastBubbleAt || 0) < BUBBLE_COOLDOWN_MS) {
        return;
      }
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => {
        const tips = this.data.tips.tips || [];
        if (!tips.length || this.data.panelOpen) {
          return;
        }
        this.lastBubbleAt = Date.now();
        this.showBubble(tips[Math.floor(Math.random() * tips.length)]);
      }, 1600);
    },

    showBubble(content) {
      const metrics = this.metrics;
      const size = this.data.size;
      const bubbleWidth = Math.round(rpxToPx(330, metrics.windowWidth));
      const onRightHalf = this.data.x + size / 2 > metrics.windowWidth / 2;
      const left = onRightHalf
        ? Math.max(EDGE_MARGIN_PX, this.data.x + size - bubbleWidth)
        : Math.min(metrics.windowWidth - bubbleWidth - EDGE_MARGIN_PX, this.data.x);
      const top = Math.max(metrics.statusBarHeight, this.data.y - Math.round(rpxToPx(88, metrics.windowWidth)));
      this.setData({
        bubbleShow: true,
        bubbleText: content,
        bubbleStyle: `left:${Math.round(left)}px;top:${Math.round(top)}px;width:${bubbleWidth}px;`
      });
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => {
        this.setData({ bubbleShow: false });
      }, BUBBLE_VISIBLE_MS);
    },

    hideBubble() {
      clearTimeout(this.bubbleTimer);
      if (this.data.bubbleShow) {
        this.setData({ bubbleShow: false });
      }
    },

    onTouchStart(event) {
      const touch = event.touches && event.touches[0];
      if (!touch) {
        return;
      }
      this.touchOrigin = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        left: this.data.x,
        top: this.data.y
      };
      this.dragMoved = false;
      this.hideBubble();
    },

    onTouchMove(event) {
      const origin = this.touchOrigin;
      const touch = event.touches && event.touches[0];
      if (!origin || !touch) {
        return;
      }
      const dx = touch.clientX - origin.clientX;
      const dy = touch.clientY - origin.clientY;
      if (!this.dragMoved && Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
        return;
      }
      this.dragMoved = true;
      const metrics = this.metrics;
      const size = this.data.size;
      const maxX = Math.max(0, metrics.windowWidth - size);
      const maxY = Math.max(metrics.statusBarHeight, metrics.windowHeight - size - this.bottomReserved);
      this.setData({
        dragging: true,
        x: Math.min(Math.max(0, origin.left + dx), maxX),
        y: Math.min(Math.max(metrics.statusBarHeight, origin.top + dy), maxY)
      });
    },

    onTouchEnd() {
      if (!this.touchOrigin) {
        return;
      }
      this.touchOrigin = null;
      if (this.longPressed) {
        this.longPressed = false;
        this.dragMoved = false;
        if (this.data.dragging) {
          this.setData({ dragging: false });
        }
        return;
      }
      if (!this.dragMoved) {
        this.openPanel();
        return;
      }
      // 松手后吸到最近的左右边缘，避免小象停在屏幕中间挡内容。
      const metrics = this.metrics;
      const size = this.data.size;
      const center = this.data.x + size / 2;
      const x = center < metrics.windowWidth / 2
        ? EDGE_MARGIN_PX
        : metrics.windowWidth - size - EDGE_MARGIN_PX;
      this.setData({ dragging: false, x });
      this.savePosition();
    },

    onTouchCancel() {
      this.touchOrigin = null;
      this.dragMoved = false;
      if (this.data.dragging) {
        this.setData({ dragging: false });
      }
    },

    onLongPress() {
      this.longPressed = true;
      this.hideBubble();
      const tips = this.data.tips;
      wx.showActionSheet({
        itemList: [tips.menuFullScreen, tips.menuReset, tips.menuHide],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.onExpand();
          } else if (res.tapIndex === 1) {
            this.onResetPosition();
          } else if (res.tapIndex === 2) {
            this.onSuppress();
          }
        },
        fail: () => {}
      });
    },

    onResetPosition() {
      petSuppressed = false;
      const position = this.resolveDefaultPosition();
      const needMount = !this.renderer;
      this.setData({ visible: true, x: position.x, y: position.y });
      this.savePosition();
      if (needMount) {
        wx.nextTick(() => this.mountRenderer());
      }
    },

    resolveDefaultPosition() {
      const metrics = this.metrics;
      const size = this.data.size;
      return {
        x: Math.max(0, metrics.windowWidth - size - EDGE_MARGIN_PX),
        y: Math.round(metrics.windowHeight * 0.58)
      };
    },

    onSuppress() {
      petSuppressed = true;
      this.hideBubble();
      this.closePanel();
      this.setData({ visible: false });
      this.teardown();
    },

    openPanel() {
      const metrics = this.metrics;
      this.savedY = this.data.y;
      this.hideBubble();
      try {
        wx.vibrateShort({ type: 'light', fail: () => {} });
      } catch (error) {
        // 部分机型不支持振动，忽略即可
      }
      const messages = loadElephantHistory();
      const panelTop = Math.max(
        metrics.statusBarHeight,
        metrics.windowHeight - this.data.panelHeight - metrics.safeAreaBottom
      );
      this.setData({
        panelOpen: true,
        messages,
        isLogin: isLoggedIn(getStoredCurrentUser()),
        y: Math.max(metrics.statusBarHeight, panelTop - this.data.size + Math.round(rpxToPx(16, metrics.windowWidth)))
      });
      this.setPetState(messages.length ? 'idle' : 'happy');
      if (this.stateTimer) {
        clearTimeout(this.stateTimer);
      }
      this.stateTimer = setTimeout(() => this.setPetState('idle'), 1600);
      this.scrollToBottom();
    },

    closePanel() {
      if (!this.data.panelOpen) {
        return;
      }
      this.setData({
        panelOpen: false,
        draft: '',
        y: Number.isFinite(this.savedY) ? this.savedY : this.data.y
      });
      this.setPetState('peek');
      this.savePosition();
    },

    onPanelTap() {
      // 只用于拦住冒泡，避免点面板时被遮罩关掉
    },

    noop() {},

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
      this.closePanel();
      wx.switchTab({ url: '/pages/profile/profile' });
    },

    onExpand() {
      this.closePanel();
      wx.navigateTo({ url: '/pages/chat/chat' });
    },

    scrollToBottom() {
      const messages = this.data.messages;
      if (!messages.length) {
        return;
      }
      this.setData({ scrollTo: `pm-${messages.length - 1}` });
    },

    async onSend() {
      const content = String(this.data.draft || '').trim();
      if (!content || this.data.sending) {
        return;
      }
      if (!isLoggedIn(getStoredCurrentUser())) {
        wx.showToast({ title: this.data.text.loginRequired, icon: 'none' });
        return;
      }

      const withUser = this.data.messages.concat([{ role: 'user', content, id: Date.now() }]);
      this.setData({ messages: withUser, draft: '', sending: true });
      saveElephantHistory(withUser);
      this.scrollToBottom();
      this.setPetState('speaking');

      clearTimeout(this.stateTimer);
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
        this.setPetState('happy');
      } catch (error) {
        console.error('elephant: 发送失败', error);
        this.setData({ sending: false });
        this.setPetState('idle');
        wx.showToast({ title: error.message || this.data.text.failed, icon: 'none' });
      }
      this.stateTimer = setTimeout(() => this.setPetState('idle'), 1500);
    }
  }
});
