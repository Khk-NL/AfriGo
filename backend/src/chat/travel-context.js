const MAX_CONTEXT_CHARS = 1800;
const MAX_ALERTS = 5;
const SEVERITY_LABELS = { critical: '极高', high: '高', medium: '中', low: '低', info: '提示' };

function text(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function clip(value, max) {
  const content = text(value);
  return content.length > max ? `${content.slice(0, max)}…` : content;
}

function parseJson(value) {
  if (value && typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function dateText(value) {
  const content = text(value);
  return content ? content.slice(0, 10) : '';
}

/** 把「标签：值1；值2」这类片段压成一行，空值（含 && 短路产生的 false）自动丢弃。 */
function field(label, ...values) {
  const parts = values
    .map((value) => (value === false || value === null || value === undefined ? '' : text(value)))
    .filter(Boolean);
  return parts.length ? `${label}：${parts.join('；')}` : '';
}

function bulletList(items, max) {
  const lines = (Array.isArray(items) ? items : [])
    .map((item) => clip(item, 60))
    .filter(Boolean)
    .slice(0, max);
  return lines.length ? lines.map((item) => `· ${item}`).join('\n') : '';
}

/**
 * 把国家整合资料 payload 压成给模型看的要点。
 * @param {object} payload country_guides.payload。
 * @returns {string[]} 每个元素是一行；空行会被过滤。
 */
function summarizeGuide(payload) {
  const guide = parseJson(payload);
  if (!guide || typeof guide !== 'object') {
    return [];
  }
  const visa = guide.visa || {};
  const security = guide.security || {};
  const customs = guide.customs || {};
  const health = guide.health || {};
  const localInfo = guide.localInfo || {};
  const extras = guide.extras || {};

  const lines = [
    field('国家', guide.countryZh, guide.countryCode && `代码 ${text(guide.countryCode)}`, guide.region),
    field('官方语言', guide.officialLanguage),
    field('紧急电话', security.policePhone && `报警 ${text(security.policePhone)}`, security.embassyPhone && `使领馆 ${text(security.embassyPhone)}`, security.medicalPhone && `急救 ${text(security.medicalPhone)}`),
    field('治安概况', security.overallCrimeIndex !== undefined && `犯罪指数 ${text(security.overallCrimeIndex)}/100`, security.highRiskAreas && security.highRiskAreas.length ? `高风险区域 ${security.highRiskAreas.map(text).filter(Boolean).slice(0, 5).join('、')}` : ''),
    field('安全提醒', clip(security.specialRisk, 160)),
    field('使领馆提示', clip(security.embassyWarning, 160)),
    field('签证', visa.types, visa.mode, visa.time && `办理时长 ${text(visa.time)}`, visa.fee && `费用 ${text(visa.fee)}`, visa.validity && `有效期 ${text(visa.validity)}`),
    field('签证政策', clip(visa.policy || guide.latestPolicyChange, 200)),
    field('入境与健康', clip(health.entryMustDesc, 160), clip(health.tickerText, 120)),
    field('风俗与禁忌', clip(customs.etiquetteText || customs.customText, 180)),
    field('着装建议', clip(customs.dressMen, 100), clip(customs.dressWomen, 100)),
    field('当地生活', clip(localInfo.summary, 120)),
    field('官方入口', clip(extras.officialSites, 160), clip(extras.embassy, 100))
  ].filter(Boolean);

  const labor = bulletList((guide.laborList || []).map((item) => `${text(item.title)}：${clip(item.content, 60)}`), 4);
  if (labor) {
    lines.push('劳务与合规：');
    lines.push(labor);
  }
  const tips = bulletList(security.travelTips, 4);
  if (tips) {
    lines.push('出行建议：');
    lines.push(tips);
  }
  const malaria = bulletList(health.malariaTips, 3);
  if (malaria) {
    lines.push('健康防护：');
    lines.push(malaria);
  }

  return lines;
}

/**
 * 把正在生效的风险提醒压成要点列表。
 * @param {Array} rows risk_alerts 查询结果。
 * @returns {string[]}
 */
function summarizeAlerts(rows) {
  const list = (Array.isArray(rows) ? rows : []).slice(0, MAX_ALERTS);
  if (!list.length) {
    return [];
  }
  const lines = ['正在生效的风险提醒（服务端人工审核）：'];
  for (const row of list) {
    const severity = SEVERITY_LABELS[text(row.severity)] || text(row.severity) || '提示';
    const source = text(row.source_name);
    const published = dateText(row.published_at);
    const expires = dateText(row.expires_at);
    const meta = [
      source && `来源 ${source}`,
      published && `发布 ${published}`,
      expires && `有效至 ${expires}`
    ].filter(Boolean).join('，');
    lines.push(`· [${severity}] ${clip(row.title, 60)}——${clip(row.summary, 140)}${meta ? `（${meta}）` : ''}`);
  }
  return lines;
}

/**
 * 组装注入 system 提示词的旅行上下文。纯函数，便于测试。
 * @param {{guide?: object, alerts?: Array, updatedAt?: string}} [input]
 * @returns {string} 上下文文本；没有任何资料时返回空串。
 */
function buildTravelContext(input = {}) {
  const lines = summarizeGuide(input.guide).concat(summarizeAlerts(input.alerts));
  if (!lines.length) {
    return '';
  }
  const updated = dateText(input.updatedAt);
  lines.push(`（以上为小程序收录资料${updated ? `，更新于 ${updated}` : ''}；与官方最新公告冲突时以官方为准。）`);
  const content = lines.join('\n');
  if (content.length <= MAX_CONTEXT_CHARS) {
    return content;
  }
  return `${content.slice(0, content.lastIndexOf('\n', MAX_CONTEXT_CHARS) > 0 ? content.lastIndexOf('\n', MAX_CONTEXT_CHARS) : MAX_CONTEXT_CHARS)}…`;
}

/**
 * 按国家代码读取整合资料与风险提醒，拼成旅行上下文。
 * 上下文只是增强项：调用方需要自己决定取不到资料时是否继续回复。
 *
 * @param {string} countryCode 两位 ISO 国家代码。
 * @param {{query: Function}} options query(sql, params) 返回 [rows]。
 * @returns {Promise<string>}
 */
async function loadTravelContext(countryCode, options = {}) {
  const code = text(countryCode).toUpperCase();
  const query = options.query;
  if (!/^[A-Z]{2}$/.test(code) || typeof query !== 'function') {
    return '';
  }
  const [guideRows] = await query(
    'SELECT payload, updated_at FROM country_guides WHERE country_code = ? LIMIT 1',
    [code]
  );
  const [alertRows] = await query(
    `SELECT severity, title, summary, source_name, published_at, expires_at
     FROM risk_alerts
     WHERE country_code = ? AND status = 'published' AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low', 'info'), published_at DESC
     LIMIT ${MAX_ALERTS}`,
    [code]
  );
  const guideRow = Array.isArray(guideRows) ? guideRows[0] : null;
  if (!guideRow && !(Array.isArray(alertRows) && alertRows.length)) {
    return '';
  }
  return buildTravelContext({
    guide: guideRow ? guideRow.payload : null,
    alerts: alertRows,
    updatedAt: guideRow ? guideRow.updated_at : ''
  });
}

module.exports = {
  MAX_CONTEXT_CHARS,
  MAX_ALERTS,
  buildTravelContext,
  loadTravelContext,
  summarizeAlerts,
  summarizeGuide
};
