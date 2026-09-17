const ALLOWED_MODES = new Set(['driving', 'walking']);
const DEFAULT_BASE_URL = 'https://sg-restapi.opnavi.com/v3/direction';

function coordinate(value, label) {
  const longitude = Number(value && value.longitude);
  const latitude = Number(value && value.latitude);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw Object.assign(new Error(`${label}坐标不合法`), { statusCode: 400 });
  }
  return {
    longitude: Number(longitude.toFixed(6)),
    latitude: Number(latitude.toFixed(6))
  };
}

function validateNavigationInput(payload = {}) {
  const mode = String(payload.mode || 'driving').trim().toLowerCase();
  if (!ALLOWED_MODES.has(mode)) {
    throw Object.assign(new Error('路线方式仅支持 driving 或 walking'), { statusCode: 400 });
  }
  return {
    mode,
    origin: coordinate(payload.origin, '起点'),
    destination: coordinate(payload.destination, '终点')
  };
}

function normalizePath(path = {}) {
  return {
    distanceMeters: Number(path.distance || 0),
    durationSeconds: Number(path.duration || 0),
    tolls: Number(path.tolls || 0),
    restriction: String(path.restriction || ''),
    steps: (Array.isArray(path.steps) ? path.steps : []).slice(0, 100).map((step) => ({
      instruction: String(step.instruction || ''),
      road: String(step.road || ''),
      distanceMeters: Number(step.distance || 0),
      durationSeconds: Number(step.duration || 0)
    }))
  };
}

async function planNavigationRoute(payload, fetchImpl = globalThis.fetch) {
  const input = validateNavigationInput(payload);
  if (String(process.env.AMAP_NAVIGATION_ENABLED).toLowerCase() !== 'true') {
    throw Object.assign(new Error('高德海外路线服务尚未配置'), { statusCode: 503 });
  }
  const key = String(process.env.AMAP_WEB_SERVICE_KEY || '').trim();
  if (!key) {
    throw Object.assign(new Error('高德 Web Service Key 尚未配置'), { statusCode: 503 });
  }
  if (typeof fetchImpl !== 'function') {
    throw Object.assign(new Error('当前 Node 运行环境不支持远程路线请求'), { statusCode: 503 });
  }

  const baseUrl = String(process.env.AMAP_NAVIGATION_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const query = new URLSearchParams({
    origin: `${input.origin.longitude},${input.origin.latitude}`,
    destination: `${input.destination.longitude},${input.destination.latitude}`,
    key,
    output: 'json'
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response;
  try {
    response = await fetchImpl(`${baseUrl}/${input.mode}?${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
  } catch (error) {
    const message = error && error.name === 'AbortError' ? '高德路线服务请求超时' : '高德路线服务暂时不可用';
    throw Object.assign(new Error(message), { statusCode: 502 });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw Object.assign(new Error('高德路线服务返回异常'), { statusCode: 502 });
  }
  let body;
  try {
    body = await response.json();
  } catch (_error) {
    throw Object.assign(new Error('高德路线服务响应无法解析'), { statusCode: 502 });
  }
  if (String(body.status) !== '1' || !body.route) {
    throw Object.assign(new Error(body.info || '未找到可用路线'), { statusCode: 502 });
  }
  const rawPaths = Array.isArray(body.route.paths)
    ? body.route.paths
    : body.route.paths ? [body.route.paths] : [];
  return {
    provider: 'amap-overseas',
    mode: input.mode,
    origin: input.origin,
    destination: input.destination,
    paths: rawPaths.slice(0, 3).map(normalizePath)
  };
}

module.exports = {
  validateNavigationInput,
  planNavigationRoute
};
