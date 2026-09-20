import { sendChatMessage } from './cloud-service.js';
import { getSelectedDestination } from './countries.js';

export const ELEPHANT_HISTORY_KEY = 'elephantChatHistory';
export const ELEPHANT_HISTORY_LIMIT = 40;
export const ELEPHANT_CONTEXT_MESSAGES = 12;

/**
 * 小象对话的界面文案。桌宠面板和全屏聊天页共用同一份，避免两处措辞不一致。
 * 键名与 utils/i18n.js 的语言代码保持一致。
 */
export const ELEPHANT_CHAT_TEXT = {
  zh: {
    title: '小象',
    subtitle: '非洲象 · 旅行小助手',
    placeholder: '问问小象…',
    send: '发送',
    thinking: '小象正在想…',
    clear: '清空',
    clearConfirm: '清空和小象的聊天记录？',
    empty: '和小象打个招呼吧',
    loginRequired: '登录后就能和小象聊天了',
    goLogin: '去登录',
    failed: '小象没听清，请再说一次',
    expand: '全屏',
    close: '收起',
    quick: ['去肯尼亚要注意什么？', '内罗毕哪些区域更安全？', '帮我列一份行前清单', '斯瓦希里语怎么道谢？']
  },
  en: {
    title: 'Ellie',
    subtitle: 'African elephant · travel assistant',
    placeholder: 'Ask the elephant…',
    send: 'Send',
    thinking: 'Thinking…',
    clear: 'Clear',
    clearConfirm: 'Clear the chat history?',
    empty: 'Say hello to the elephant',
    loginRequired: 'Sign in to chat with the elephant',
    goLogin: 'Sign in',
    failed: 'The elephant did not catch that, please retry',
    expand: 'Full screen',
    close: 'Hide',
    quick: ['What should I know before Kenya?', 'Which areas of Nairobi are safer?', 'Draft a pre-trip checklist', 'How do I say thank you in Swahili?']
  },
  fr: {
    title: 'Ellie',
    subtitle: 'Éléphant d’Afrique · assistant de voyage',
    placeholder: 'Demandez à l’éléphant…',
    send: 'Envoyer',
    thinking: 'Réflexion…',
    clear: 'Effacer',
    clearConfirm: 'Effacer l’historique de discussion ?',
    empty: 'Dites bonjour à l’éléphant',
    loginRequired: 'Connectez-vous pour discuter avec l’éléphant',
    goLogin: 'Se connecter',
    failed: 'L’éléphant n’a pas compris, réessayez',
    expand: 'Plein écran',
    close: 'Réduire',
    quick: ['Que savoir avant le Kenya ?', 'Quels quartiers de Nairobi sont plus sûrs ?', 'Prépare une liste avant départ', 'Comment dire merci en swahili ?']
  }
};

/** 读取本地保存的聊天记录；存储不可用时返回空数组。 */
export function loadElephantHistory() {
  try {
    const stored = wx.getStorageSync(ELEPHANT_HISTORY_KEY);
    return Array.isArray(stored) ? stored.slice(-ELEPHANT_HISTORY_LIMIT) : [];
  } catch (error) {
    console.warn('elephant: 读取聊天记录失败', error);
    return [];
  }
}

/** 保存聊天记录，只保留最近 ELEPHANT_HISTORY_LIMIT 条。 */
export function saveElephantHistory(messages) {
  try {
    wx.setStorageSync(ELEPHANT_HISTORY_KEY, (Array.isArray(messages) ? messages : []).slice(-ELEPHANT_HISTORY_LIMIT));
  } catch (error) {
    console.warn('elephant: 保存聊天记录失败', error);
  }
}

export function clearElephantHistory() {
  saveElephantHistory([]);
}

/** 裁剪成请求体：只带 role/content，并把条数收敛到上下文窗口。 */
export function toRequestMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((item) => item && item.role && item.content)
    .slice(-ELEPHANT_CONTEXT_MESSAGES)
    .map((item) => ({ role: item.role, content: item.content }));
}

/**
 * 发一轮对话给小象。国家由本地已选目的地决定，服务端据此注入该国资料。
 * @param {Array<{role: string, content: string}>} messages 完整历史（含最新一条用户消息）。
 * @returns {Promise<{reply: string, model?: string}>}
 */
export async function askElephant(messages) {
  const destination = getSelectedDestination();
  return sendChatMessage(toRequestMessages(messages), {
    countryCode: destination.code,
    country: destination.zhName
  });
}
