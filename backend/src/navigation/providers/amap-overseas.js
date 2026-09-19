const { buildPath } = require('../normalize');

const DEFAULT_BASE_URL = 'https://sg-restapi.opnavi.com/v3/direction';

/**
 * 高德海外 Web Service。需要企业开发者认证并工单开通海外 LBS 权限，
 * 因此默认关闭；未开通时保持 AMAP_NAVIGATION_ENABLED=false。
 * @type {import('./index').NavigationProvider}
 */
module.exports = {
  id: 'amap-overseas',
  label: '高德海外路线',
  docsUrl: 'https://lbs.amap.com/api/web-service/guide/routes',
  configKeys: ['AMAP_NAVIGATION_ENABLED', 'AMAP_WEB_SERVICE_KEY', 'AMAP_NAVIGATION_BASE_URL'],

  isConfigured(env) {
    return String(env.AMAP_NAVIGATION_ENABLED).toLowerCase() === 'true'
      && String(env.AMAP_WEB_SERVICE_KEY || '').trim().length > 0;
  },

  async plan(input, { env, fetchJson }) {
    const key = String(env.AMAP_WEB_SERVICE_KEY || '').trim();
    const baseUrl = String(env.AMAP_NAVIGATION_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    const query = new URLSearchParams({
      origin: `${input.origin.longitude},${input.origin.latitude}`,
      destination: `${input.destination.longitude},${input.destination.latitude}`,
      key,
      output: 'json'
    });

    const body = await fetchJson(`${baseUrl}/${input.mode}?${query}`);
    if (String(body.status) !== '1' || !body.route) {
      throw Object.assign(new Error(body.info || '未找到可用路线'), { statusCode: 502 });
    }
    const rawPaths = Array.isArray(body.route.paths)
      ? body.route.paths
      : body.route.paths ? [body.route.paths] : [];
    return {
      paths: rawPaths.map((path) => buildPath({
        distanceMeters: path.distance,
        durationSeconds: path.duration,
        tolls: path.tolls,
        restriction: path.restriction,
        steps: (Array.isArray(path.steps) ? path.steps : []).map((step) => ({
          instruction: step.instruction,
          road: step.road,
          distanceMeters: step.distance,
          durationSeconds: step.duration
        }))
      }))
    };
  }
};
