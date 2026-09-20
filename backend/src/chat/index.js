const { DISABLED_PROVIDER_ID, getProvider, listProviderIds } = require('./providers');

const DEFAULT_PROVIDER_ID = 'deepseek';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

/**
 * 大象人设。放在服务端而不是小程序里，改文案不用重新发版，也不会被客户端篡改。
 * 可用 AI_SYSTEM_PROMPT 覆盖。
 */
const DEFAULT_SYSTEM_PROMPT = [
  '你是一只名叫「小象」的非洲象，是「非行智航」小程序里陪伴中国旅行者的向导。',
  '你熟悉非洲各国的签证、安全、健康、风俗、劳务和常用语，也会讲非洲草原上的见闻。',
  '说话亲切、简短，像朋友聊天，不要用书面报告的口吻。',
  '回答用中文，尽量控制在 200 字以内。',
  '涉及签证政策、安全局势、医疗和法律的具体决定时，提醒用户以官方渠道为准。',
  '不确定的事情直接说不确定，不要编造。'
].join('');

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * 清洗小程序传来的历史消息：只保留 user/assistant 两种角色，限制条数与长度。
 * @param {Array} raw 请求体里的 messages。
 * @returns {Array<{role: string, content: string}>}
 */
function sanitizeChatMessages(raw) {
  if (!Array.isArray(raw) || !raw.length) {
    throw httpError('请输入要发送的内容', 400);
  }
  const messages = raw
    .slice(-MAX_MESSAGES)
    .map((item) => ({
      role: item && item.role === 'assistant' ? 'assistant' : 'user',
      content: String((item && item.content) || '').trim().slice(0, MAX_MESSAGE_CHARS)
    }))
    .filter((item) => item.content);
  if (!messages.length) {
    throw httpError('请输入要发送的内容', 400);
  }
  if (messages[messages.length - 1].role !== 'user') {
    throw httpError('最后一条消息必须来自用户', 400);
  }
  return messages;
}

/**
 * @param {object} [env] 环境变量来源。
 * @returns {string} AI_PROVIDER 的取值，未配置时为默认 Provider。
 */
function resolveProviderId(env = process.env) {
  const configured = String(env.AI_PROVIDER || '').trim().toLowerCase();
  return configured || DEFAULT_PROVIDER_ID;
}

function createFetcher(fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    dispose() {
      clearTimeout(timer);
    },
    async fetchJson(url, init = {}) {
      let response;
      try {
        response = await fetchImpl(url, { ...init, signal: controller.signal });
      } catch (error) {
        const timedOut = error && error.name === 'AbortError';
        throw httpError(timedOut ? 'AI 服务响应超时，请稍后重试' : 'AI 服务暂时不可用', 502);
      }
      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = (body && body.error && body.error.message) || '';
        } catch (error) {
          // 出错响应不是 JSON（例如网关返回 HTML），忽略细节，下面按状态码给提示
        }
        const hint = response.status === 401 ? 'AI 服务鉴权失败'
          : response.status === 402 ? 'AI 服务余额不足'
            : response.status === 429 ? 'AI 服务请求过于频繁'
              : 'AI 服务返回异常';
        throw httpError(`${hint}${detail ? `：${detail}` : ''}`, 502);
      }
      try {
        return await response.json();
      } catch (error) {
        throw httpError('AI 服务响应无法解析', 502);
      }
    }
  };
}

/**
 * 让大象回复一段对话。
 * @param {Array} rawMessages 小程序传来的历史消息（user/assistant）。
 * @param {object} [options] env、fetchImpl、timeoutMs，便于测试注入。
 * @returns {Promise<{reply: string, model: string, usage: object|null}>}
 */
async function sendChatMessage(rawMessages, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const messages = sanitizeChatMessages(rawMessages);

  const providerId = resolveProviderId(env);
  if (providerId === DISABLED_PROVIDER_ID) {
    throw httpError('AI 对话已在配置中禁用', 503);
  }
  const provider = getProvider(providerId);
  if (!provider) {
    throw httpError(
      `不支持的 AI Provider：${providerId}（可用：${listProviderIds().join(' / ')} / ${DISABLED_PROVIDER_ID}）`,
      503
    );
  }
  if (!provider.isConfigured(env)) {
    throw httpError(`${provider.label}尚未配置，请设置 ${provider.configKeys.join(' / ')}`, 503);
  }
  if (typeof fetchImpl !== 'function') {
    throw httpError('当前 Node 运行环境不支持远程请求', 503);
  }

  const systemPrompt = String(env.AI_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT);
  const fetcher = createFetcher(fetchImpl, timeoutMs);
  try {
    return await provider.complete([{ role: 'system', content: systemPrompt }, ...messages], {
      env,
      fetchJson: fetcher.fetchJson
    });
  } finally {
    fetcher.dispose();
  }
}

module.exports = {
  DEFAULT_PROVIDER_ID,
  DISABLED_PROVIDER_ID,
  DEFAULT_SYSTEM_PROMPT,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  listProviderIds,
  resolveProviderId,
  sanitizeChatMessages,
  sendChatMessage
};
