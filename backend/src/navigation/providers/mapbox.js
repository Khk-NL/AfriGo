const { buildPath, finiteNumber } = require('../normalize');

const DEFAULT_BASE_URL = 'https://api.mapbox.com/directions/v5/mapbox';
const PROFILE_BY_MODE = { driving: 'driving', walking: 'walking' };

/**
 * Mapbox Directions：自助注册即可用、覆盖全球，是高德海外权限未开通时最省事的替代。
 * 文档 https://docs.mapbox.com/api/navigation/directions/
 * @type {import('./index').NavigationProvider}
 */
module.exports = {
  id: 'mapbox',
  label: 'Mapbox 路线',
  docsUrl: 'https://docs.mapbox.com/api/navigation/directions/',
  configKeys: ['MAPBOX_ACCESS_TOKEN', 'MAPBOX_DIRECTIONS_BASE_URL'],

  isConfigured(env) {
    return String(env.MAPBOX_ACCESS_TOKEN || '').trim().length > 0;
  },

  async plan(input, { env, fetchJson }) {
    const token = String(env.MAPBOX_ACCESS_TOKEN || '').trim();
    const baseUrl = String(env.MAPBOX_DIRECTIONS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    const profile = PROFILE_BY_MODE[input.mode];
    const coordinates = `${input.origin.longitude},${input.origin.latitude};${input.destination.longitude},${input.destination.latitude}`;
    const query = new URLSearchParams({
      access_token: token,
      steps: 'true',
      overview: 'false',
      geometries: 'geojson'
    });

    const body = await fetchJson(`${baseUrl}/${profile}/${coordinates}?${query}`);
    if (String(body.code) !== 'Ok') {
      throw Object.assign(new Error(body.message || `路线服务返回 ${body.code || '未知状态'}`), { statusCode: 502 });
    }
    const routes = Array.isArray(body.routes) ? body.routes : [];
    return {
      paths: routes.map((route) => {
        const legs = Array.isArray(route.legs) ? route.legs : [];
        const steps = legs.flatMap((leg) => (Array.isArray(leg.steps) ? leg.steps : []));
        return buildPath({
          distanceMeters: route.distance,
          durationSeconds: route.duration,
          tolls: 0,
          restriction: '',
          steps: steps.map((step) => ({
            instruction: step.maneuver && step.maneuver.instruction,
            road: step.name,
            distanceMeters: finiteNumber(step.distance),
            durationSeconds: finiteNumber(step.duration)
          }))
        });
      })
    };
  }
};
