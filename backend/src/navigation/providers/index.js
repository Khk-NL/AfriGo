const amapOverseas = require('./amap-overseas');
const mapbox = require('./mapbox');
const googleDirections = require('./google-directions');

/**
 * 路线 Provider 契约。新增地图服务只需实现本形状并注册到 PROVIDERS，
 * 不改动 navigation/index.js 与任何调用方。
 *
 * @typedef {object} NavigationProvider
 * @property {string} id            配置里 NAVIGATION_PROVIDER 使用的稳定标识
 * @property {string} label         下发到客户端的展示名（客户端不再硬编码地图品牌）
 * @property {string} docsUrl       申请/开通该服务的官方文档
 * @property {string[]} configKeys  未配置时需要提示的环境变量
 * @property {(env: object) => boolean} isConfigured 凭据是否就绪；未就绪时接口返回 503
 * @property {(input: {mode: string, origin: object, destination: object},
 *   ctx: {env: object, fetchJson: (url: string) => Promise<object>}) => Promise<{paths: object[]}>} plan
 *   只负责拼 URL 与解析响应；超时、HTTP 错误、路径归一化由调用方统一处理。
 */

const PROVIDERS = Object.freeze([amapOverseas, mapbox, googleDirections]);
const BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

/** 显式关闭路线能力的取值；与"未配置"区分，便于运维确认是有意关闭。 */
const DISABLED_PROVIDER_ID = 'disabled';

/** @returns {string[]} 已注册的 Provider id 列表。 */
function listProviderIds() {
  return PROVIDERS.map((provider) => provider.id);
}

/**
 * @param {string} id
 * @returns {NavigationProvider|null} 未注册时返回 null，由调用方决定如何报错。
 */
function getProvider(id) {
  return BY_ID.get(String(id === undefined || id === null ? '' : id).trim().toLowerCase()) || null;
}

module.exports = { PROVIDERS, DISABLED_PROVIDER_ID, listProviderIds, getProvider };
