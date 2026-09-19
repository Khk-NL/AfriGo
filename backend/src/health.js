const { version } = require('../package.json');
const { resolveProviderId } = require('./navigation');

const SERVICE_NAME = 'afrigo-api';

/**
 * 健康检查响应体。只包含用于确认"线上跑的是哪份代码"的标识，不含任何凭据。
 * @param {object} [env] 环境变量来源，默认 process.env。
 * @param {{uptimeSeconds?: number, now?: number}} [options] 便于测试注入。
 * @returns {{ok: boolean, service: string, version: string, env: string, navigationProvider: string, uptimeSeconds: number, serverTime: string}}
 */
function buildHealthPayload(env = process.env, options = {}) {
  const uptimeSeconds = Number.isFinite(options.uptimeSeconds)
    ? options.uptimeSeconds
    : Math.round(process.uptime());
  return {
    ok: true,
    service: SERVICE_NAME,
    version,
    env: String(env.NODE_ENV || 'development'),
    navigationProvider: resolveProviderId(env),
    uptimeSeconds,
    serverTime: new Date(options.now === undefined ? Date.now() : options.now).toISOString()
  };
}

module.exports = { SERVICE_NAME, buildHealthPayload };
