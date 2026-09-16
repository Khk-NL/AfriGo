const EXPENSE_CATEGORIES = new Set(['transport', 'accommodation', 'food', 'activities', 'insurance', 'other']);

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function sanitizeExpensePayload(payload = {}) {
  const amount = Math.round(Number(payload.amount) * 100) / 100;
  if (!EXPENSE_CATEGORIES.has(payload.category)) throw new Error('请选择有效的费用分类');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) throw new Error('请输入有效的费用金额');
  const spentOn = text(payload.spentOn, 10);
  if (spentOn && !/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) throw new Error('费用日期格式不正确');
  return {
    category: payload.category,
    amount,
    currency: payload.currency === 'USD' ? 'USD' : 'CNY',
    note: text(payload.note, 300),
    spentOn
  };
}

function sanitizeReviewPayload(payload = {}) {
  const rating = Number.parseInt(payload.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('评分必须在 1 到 5 星之间');
  const summary = text(payload.summary, 2000);
  const highlights = text(payload.highlights, 2000);
  const lessons = text(payload.lessons, 2000);
  if (!summary && !highlights && !lessons) throw new Error('请至少填写一项复盘内容');
  return { rating, summary, highlights, lessons };
}

module.exports = {
  sanitizeExpensePayload,
  sanitizeReviewPayload
};
