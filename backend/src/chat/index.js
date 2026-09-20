const { DISABLED_PROVIDER_ID, getProvider, listProviderIds } = require('./providers');
const { PERSONA_BODY, PERSONA_TITLE, buildSystemPrompt } = require('./persona');

const DEFAULT_PROVIDER_ID = 'deepseek';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

/** 未附带国家资料时的人设全文，等价于 buildSystemPrompt({})。 */
const DEFAULT_SYSTEM_PROMPT = buildSystemPrompt();

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
 * @param {object} [options] env、fetchImpl、timeoutMs、travelContext，便于测试注入。
 *   travelContext 由 loadTravelContext 生成，作为本次对话的国家资料快照。
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

  const systemPrompt = buildSystemPrompt({
    travelContext: options.travelContext,
    override: env.AI_SYSTEM_PROMPT
  });
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
  PERSONA_TITLE,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  listProviderIds,
  resolveProviderId,
  sanitizeChatMessages,
  sendChatMessage
};
