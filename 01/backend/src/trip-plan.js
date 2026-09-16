const { normalizeCountryCode } = require('./countries');

const PURPOSES = new Set(['travel', 'work', 'business']);
const VISA_STAGES = new Set(['not_started', 'preparing', 'submitted', 'approved']);
const BUDGET_KEYS = ['transport', 'accommodation', 'food', 'activities', 'insurance', 'other'];

function text(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength);
}

function date(value) {
  const normalized = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

function amount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(Math.round(number * 100) / 100, 100000000);
}

function normalizeChecklist(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map((item, index) => ({
    id: text(item && item.id, 64) || `item-${index + 1}`,
    title: text(item && item.title, 120),
    done: !!(item && item.done)
  })).filter((item) => item.title);
}

function sanitizeTripPayload(payload = {}) {
  const countryZh = text(payload.countryZh, 64);
  const countryCode = normalizeCountryCode(payload.countryCode, countryZh);
  const purpose = PURPOSES.has(payload.purpose) ? payload.purpose : 'travel';
  const startDate = date(payload.startDate);
  const endDate = date(payload.endDate);
  if (!countryCode || !countryZh) throw new Error('请选择有效的目的地');
  if (startDate && endDate && endDate < startDate) throw new Error('返程日期不能早于出发日期');

  const budgetInput = payload.budget && typeof payload.budget === 'object' ? payload.budget : {};
  const budget = Object.fromEntries(BUDGET_KEYS.map((key) => [key, amount(budgetInput[key])]));
  const visaInput = payload.visa && typeof payload.visa === 'object' ? payload.visa : {};
  const stage = VISA_STAGES.has(visaInput.stage) ? visaInput.stage : 'not_started';
  const bookingsInput = payload.bookings && typeof payload.bookings === 'object' ? payload.bookings : {};

  return {
    name: text(payload.name, 80) || `${countryZh}行程`,
    countryCode,
    countryZh,
    purpose,
    startDate,
    endDate,
    travelers: Math.min(Math.max(Number.parseInt(payload.travelers, 10) || 1, 1), 20),
    currency: payload.currency === 'USD' ? 'USD' : 'CNY',
    budget,
    visa: { stage, note: text(visaInput.note, 500) },
    checklist: normalizeChecklist(payload.checklist),
    itineraryText: text(payload.itineraryText, 10000),
    bookings: {
      flight: text(bookingsInput.flight, 500),
      hotel: text(bookingsInput.hotel, 500),
      localTransport: text(bookingsInput.localTransport, 500)
    }
  };
}

module.exports = {
  BUDGET_KEYS,
  sanitizeTripPayload
};
