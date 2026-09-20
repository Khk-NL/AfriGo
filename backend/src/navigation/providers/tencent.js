const { buildPath, finiteNumber } = require('../normalize');

const DEFAULT_BASE_URL = 'https://apis.map.qq.com/ws/direction/v1';
const SECONDS_PER_MINUTE = 60;

/** 腾讯的 restriction 是 {status} 对象，0 表示不涉及限行；其余状态码原样下发。 */
function restrictionText(restriction) {
  const status = finiteNumber(restriction && restriction.status);
  return status > 0 ? String(status) : '';
}

/** 腾讯的 duration 单位是分钟，归一化结果统一为秒。 */
function durationSeconds(minutes) {
  return finiteNumber(minutes) * SECONDS_PER_MINUTE;
}

/**
 * 腾讯位置服务 Direction：自助注册即可开通、有免费额度，是国内 Key 的省事选择。
 * 注意腾讯的 from/to 是 "纬度,经度"，与高德/Mapbox 相反。
 * 文档 https://lbs.qq.com/service/webService/webServiceGuide/webServiceRoute
 * @type {import('./index').NavigationProvider}
 */
module.exports = {
  id: 'tencent',
  label: '腾讯地图路线',
  docsUrl: 'https://lbs.qq.com/service/webService/webServiceGuide/webServiceRoute',
  configKeys: ['TENCENT_MAP_KEY', 'TENCENT_DIRECTIONS_BASE_URL'],

  isConfigured(env) {
    return String(env.TENCENT_MAP_KEY || '').trim().length > 0;
  },

  async plan(input, { env, fetchJson }) {
    const key = String(env.TENCENT_MAP_KEY || '').trim();
    const baseUrl = String(env.TENCENT_DIRECTIONS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    const query = new URLSearchParams({
      from: `${input.origin.latitude},${input.origin.longitude}`,
      to: `${input.destination.latitude},${input.destination.longitude}`,
      key
    });

    const body = await fetchJson(`${baseUrl}/${input.mode}/?${query}`);
    if (finiteNumber(body.status, -1) !== 0) {
      throw Object.assign(
        new Error(body.message || `路线服务返回 ${body.status || '未知状态'}`),
        { statusCode: 502 }
      );
    }
    const routes = Array.isArray(body.result && body.result.routes) ? body.result.routes : [];
    return {
      paths: routes.map((route) => buildPath({
        distanceMeters: route.distance,
        durationSeconds: durationSeconds(route.duration),
        tolls: route.toll,
        restriction: restrictionText(route.restriction),
        steps: (Array.isArray(route.steps) ? route.steps : []).map((step) => ({
          instruction: step.instruction,
          road: step.road_name,
          distanceMeters: step.distance,
          durationSeconds: durationSeconds(step.duration)
        }))
      }))
    };
  }
};
