const { normalizeCountryCode } = require('./countries');

const CONTENT_TYPES = new Set(['guide', 'security', 'visa', 'health', 'customs', 'phrases', 'attraction', 'recommend', 'service']);
const RISK_SEVERITIES = new Set(['info', 'low', 'medium', 'high', 'critical']);
const RISK_STATUSES = new Set(['draft', 'published', 'expired']);
const CORRECTION_STATUSES = new Set(['pending', 'accepted', 'rejected']);

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function invalid(message) {
  throw Object.assign(new Error(message), { statusCode: 400 });
}

function mysqlDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) invalid('时间格式不正确');
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function sanitizeCorrectionPayload(payload = {}) {
  const countryZh = text(payload.countryZh, 64);
  const countryCode = normalizeCountryCode(payload.countryCode, countryZh);
  if (!countryCode || !countryZh) invalid('请选择有效的国家');
  if (!CONTENT_TYPES.has(payload.contentType)) invalid('请选择有效的内容类型');
  const title = text(payload.title, 160);
  const description = text(payload.description, 2000);
  if (!title || !description) invalid('请填写问题标题和纠错说明');
  return {
    countryCode,
    countryZh,
    contentType: payload.contentType,
    contentId: text(payload.contentId, 128),
    title,
    description,
    sourceUrl: text(payload.sourceUrl, 500)
  };
}

function sanitizeRiskAlertPayload(payload = {}) {
  const countryZh = text(payload.countryZh, 64);
  const countryCode = normalizeCountryCode(payload.countryCode, countryZh);
  if (!countryCode || !countryZh) invalid('请选择有效的风险国家');
  if (!RISK_SEVERITIES.has(payload.severity)) invalid('请选择有效的风险等级');
  const title = text(payload.title, 160);
  const summary = text(payload.summary, 2000);
  const sourceName = text(payload.sourceName, 160);
  const sourceUrl = text(payload.sourceUrl, 500);
  if (!title || !summary || !sourceName || !sourceUrl) invalid('风险提醒必须包含标题、说明和来源');
  const publishedAt = mysqlDateTime(payload.publishedAt || new Date());
  const expiresAt = mysqlDateTime(payload.expiresAt);
  if (expiresAt && expiresAt <= publishedAt) invalid('风险提醒过期时间必须晚于发布时间');
  return {
    countryCode,
    countryZh,
    severity: payload.severity,
    title,
    summary,
    sourceName,
    sourceUrl,
    publishedAt,
    expiresAt,
    status: RISK_STATUSES.has(payload.status) ? payload.status : 'draft'
  };
}

module.exports = {
  CORRECTION_STATUSES,
  sanitizeCorrectionPayload,
  sanitizeRiskAlertPayload
};
