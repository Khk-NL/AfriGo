const { normalizeCountryCode } = require('./countries');

const SERVICE_CATEGORIES = new Set(['hotel', 'transport', 'guide', 'insurance']);
const PROVIDER_STATUSES = new Set(['pending', 'approved', 'suspended']);
const LEAD_STATUSES = new Set(['new', 'contacted', 'closed', 'rejected']);

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function invalid(message) {
  throw Object.assign(new Error(message), { statusCode: 400 });
}

function sanitizeProviderPayload(payload = {}) {
  const countryZh = text(payload.countryZh, 64);
  const countryCode = normalizeCountryCode(payload.countryCode, countryZh);
  if (!countryCode || !countryZh) invalid('请选择有效的服务国家');
  if (!SERVICE_CATEGORIES.has(payload.category)) invalid('请选择有效的服务分类');
  const name = text(payload.name, 120);
  if (!name) invalid('服务方名称不能为空');
  return {
    countryCode,
    countryZh,
    category: payload.category,
    name,
    summary: text(payload.summary, 1000),
    qualificationNote: text(payload.qualificationNote, 500),
    sourceUrl: text(payload.sourceUrl, 500),
    contactChannel: text(payload.contactChannel, 40),
    contactValue: text(payload.contactValue, 200),
    status: PROVIDER_STATUSES.has(payload.status) ? payload.status : 'pending'
  };
}

function sanitizeLeadPayload(payload = {}) {
  const providerId = Number.parseInt(payload.providerId, 10);
  if (!Number.isInteger(providerId) || providerId <= 0) invalid('请选择有效的服务方');
  const contactName = text(payload.contactName, 80);
  const contactValue = text(payload.contactValue, 160);
  const requestText = text(payload.requestText, 1000);
  if (!contactName || !contactValue) invalid('请填写联系人和联系方式');
  if (!requestText) invalid('请说明服务需求');
  return { providerId, contactName, contactValue, requestText };
}

module.exports = {
  LEAD_STATUSES,
  sanitizeLeadPayload,
  sanitizeProviderPayload
};
