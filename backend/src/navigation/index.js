const { DISABLED_PROVIDER_ID, getProvider, listProviderIds } = require('./providers');
const { capPaths } = require('./normalize');

const DEFAULT_PROVIDER_ID = 'amap-overseas';
const DEFAULT_TIMEOUT_MS = 10_000;

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function coordinate(value, label) {
  const longitude = Number(value && value.longitude);
  const latitude = Number(value && value.latitude);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw httpError(`${label}坐标不合法`, 400);
  }
  return {
    longitude: Number(longitude.toFixed(6)),
    latitude: Number(latitude.toFixed(6))
  };
}

/**
 * @param {object} payload 请求体，字段为 mode / origin / destination。
 * @returns {{mode: string, origin: object, destination: object}}
 */
function validateNavigationInput(payload = {}) {
  const mode = String(payload.mode || 'driving').trim().toLowerCase();
  if (mode !== 'driving' && mode !== 'walking') {
    throw httpError('路线方式仅支持 driving 或 walking', 400);
  }
  return {
    mode,
    origin: coordinate(payload.origin, '起点'),
    destination: coordinate(payload.destination, '终点')
  };
}

/**
 * @param {object} [env] 环境变量来源，默认 process.env。
 * @returns {string} NAVIGATION_PROVIDER 的取值，未配置时为默认 Provider。
 */
function resolveProviderId(env = process.env) {
  const configured = String(env.NAVIGATION_PROVIDER || '').trim().toLowerCase();
  return configured || DEFAULT_PROVIDER_ID;
}

function createFetcher(fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    dispose() {
      clearTimeout(timer);
    },
    async fetchJson(url) {
      let response;
      try {
        response = await fetchImpl(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
      } catch (error) {
        const timedOut = error && error.name === 'AbortError';
        throw httpError(timedOut ? '路线服务请求超时' : '路线服务暂时不可用', 502);
      }
      if (!response.ok) throw httpError('路线服务返回异常', 502);
      try {
        return await response.json();
      } catch (error) {
        throw httpError('路线服务响应无法解析', 502);
      }
    }
  };
}

/**
 * 通过 NAVIGATION_PROVIDER 选定的地图服务预估路线。
 * Provider 未注册返回 503，未配置凭据返回 503，上游异常返回 502。
 *
 * @param {object} payload 请求体：mode / origin / destination。
 * @param {object} [options] env、fetchImpl、timeoutMs，便于测试注入。
 * @returns {Promise<{provider: string, providerLabel: string, mode: string, origin: object, destination: object, paths: object[]}>}
 */
async function planNavigationRoute(payload, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const input = validateNavigationInput(payload);

  const providerId = resolveProviderId(env);
  if (providerId === DISABLED_PROVIDER_ID) {
    throw httpError('路线服务已在配置中禁用', 503);
  }
  const provider = getProvider(providerId);
  if (!provider) {
    throw httpError(
      `不支持的路线 Provider：${providerId}（可用：${listProviderIds().join(' / ')} / ${DISABLED_PROVIDER_ID}）`,
      503
    );
  }
  if (!provider.isConfigured(env)) {
    throw httpError(`${provider.label}尚未配置，请设置 ${provider.configKeys.join(' / ')}`, 503);
  }
  if (typeof fetchImpl !== 'function') {
    throw httpError('当前 Node 运行环境不支持远程路线请求', 503);
  }

  const fetcher = createFetcher(fetchImpl, timeoutMs);
  try {
    const result = await provider.plan(input, { env, fetchJson: fetcher.fetchJson });
    return {
      provider: provider.id,
      providerLabel: provider.label,
      mode: input.mode,
      origin: input.origin,
      destination: input.destination,
      paths: capPaths(result && result.paths)
    };
  } finally {
    fetcher.dispose();
  }
}

module.exports = {
  DEFAULT_PROVIDER_ID,
  DISABLED_PROVIDER_ID,
  listProviderIds,
  resolveProviderId,
  validateNavigationInput,
  planNavigationRoute
};
