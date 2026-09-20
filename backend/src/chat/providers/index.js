const deepseek = require('./deepseek');

/**
 * 对话 Provider 契约。新增模型服务只需实现本形状并注册到 PROVIDERS，
 * 不改动 chat/index.js 与调用方。
 *
 * @typedef {object} ChatProvider
 * @property {string} id            配置里 AI_PROVIDER 使用的标识
 * @property {string} label         展示名
 * @property {string} docsUrl       官方文档
 * @property {string[]} configKeys  未配置时需要提示的环境变量
 * @property {(env: object) => boolean} isConfigured 凭据是否就绪
 * @property {(messages: object[], ctx: {env: object, fetchJson: (url: string, init?: object) => Promise<object>}) => Promise<{reply: string, model: string, usage: object|null}>} complete
 *   只负责拼请求与解析响应；超时、HTTP 错误、消息清洗由调用方统一处理。
 */

const PROVIDERS = Object.freeze([deepseek]);
const BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

/** 显式关闭 AI 能力的取值。 */
const DISABLED_PROVIDER_ID = 'disabled';

/** @returns {string[]} 已注册的 Provider id 列表。 */
function listProviderIds() {
  return PROVIDERS.map((provider) => provider.id);
}

/**
 * @param {string} id
 * @returns {ChatProvider|null} 未注册时返回 null。
 */
function getProvider(id) {
  return BY_ID.get(String(id === undefined || id === null ? '' : id).trim().toLowerCase()) || null;
}

module.exports = { PROVIDERS, DISABLED_PROVIDER_ID, listProviderIds, getProvider };
