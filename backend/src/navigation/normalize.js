// 路线结果归一化：所有 Provider 都必须产出这里的形状，前端只认这个形状。

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function text(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function buildStep(step = {}) {
  return {
    instruction: text(step.instruction),
    road: text(step.road),
    distanceMeters: finiteNumber(step.distanceMeters),
    durationSeconds: finiteNumber(step.durationSeconds)
  };
}

/**
 * @param {object} path 期望字段：distanceMeters / durationSeconds / tolls / restriction / steps
 * @returns {{distanceMeters:number,durationSeconds:number,tolls:number,restriction:string,steps:object[]}}
 */
function buildPath(path = {}) {
  const steps = Array.isArray(path.steps) ? path.steps : [];
  return {
    distanceMeters: finiteNumber(path.distanceMeters),
    durationSeconds: finiteNumber(path.durationSeconds),
    tolls: finiteNumber(path.tolls),
    restriction: text(path.restriction),
    steps: steps.slice(0, 100).map(buildStep)
  };
}

function capPaths(paths, maxPaths = 3) {
  return (Array.isArray(paths) ? paths : []).slice(0, maxPaths).map(buildPath);
}

/** 去掉 Google Directions 返回的 HTML 标签，只留下可读指令。 */
function stripHtml(value) {
  return text(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { finiteNumber, text, buildPath, buildStep, capPaths, stripHtml };
