const { buildPath, finiteNumber, stripHtml } = require('../normalize');

const DEFAULT_BASE_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * Google Directions：覆盖最广，但需要 Google Cloud 项目并绑定结算账号。
 * 注意 Google 的 origin/destination 是 "纬度,经度"，与高德/Mapbox 相反。
 * 文档 https://developers.google.com/maps/documentation/directions
 * @type {import('./index').NavigationProvider}
 */
module.exports = {
  id: 'google-directions',
  label: 'Google 路线',
  docsUrl: 'https://developers.google.com/maps/documentation/directions',
  configKeys: ['GOOGLE_MAPS_API_KEY', 'GOOGLE_DIRECTIONS_BASE_URL'],

  isConfigured(env) {
    return String(env.GOOGLE_MAPS_API_KEY || '').trim().length > 0;
  },

  async plan(input, { env, fetchJson }) {
    const key = String(env.GOOGLE_MAPS_API_KEY || '').trim();
    const baseUrl = String(env.GOOGLE_DIRECTIONS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    const query = new URLSearchParams({
      origin: `${input.origin.latitude},${input.origin.longitude}`,
      destination: `${input.destination.latitude},${input.destination.longitude}`,
      mode: input.mode,
      key,
      language: 'zh-CN'
    });

    const body = await fetchJson(`${baseUrl}?${query}`);
    if (String(body.status) !== 'OK') {
      throw Object.assign(
        new Error(body.error_message || `路线服务返回 ${body.status || '未知状态'}`),
        { statusCode: 502 }
      );
    }
    const routes = Array.isArray(body.routes) ? body.routes : [];
    return {
      paths: routes.map((route) => {
        const legs = Array.isArray(route.legs) ? route.legs : [];
        const steps = legs.flatMap((leg) => (Array.isArray(leg.steps) ? leg.steps : []));
        const distance = legs.reduce((sum, leg) => sum + finiteNumber(leg.distance && leg.distance.value), 0);
        const duration = legs.reduce((sum, leg) => sum + finiteNumber(leg.duration && leg.duration.value), 0);
        return buildPath({
          distanceMeters: distance,
          durationSeconds: duration,
          tolls: 0,
          restriction: '',
          steps: steps.map((step) => ({
            instruction: stripHtml(step.html_instructions),
            road: '',
            distanceMeters: step.distance && step.distance.value,
            durationSeconds: step.duration && step.duration.value
          }))
        });
      })
    };
  }
};
