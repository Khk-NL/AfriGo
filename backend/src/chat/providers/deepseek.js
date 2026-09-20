const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

/**
 * DeepSeek 对话补全。Key 只存服务端环境变量，绝不下发小程序。
 * 文档 https://api-docs.deepseek.com/
 * @type {import('./index').ChatProvider}
 */
module.exports = {
  id: 'deepseek',
  label: 'DeepSeek',
  docsUrl: 'https://api-docs.deepseek.com/',
  configKeys: ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'DEEPSEEK_MODEL'],

  isConfigured(env) {
    return String(env.DEEPSEEK_API_KEY || '').trim().length > 0;
  },

  async complete(messages, { env, fetchJson }) {
    const key = String(env.DEEPSEEK_API_KEY || '').trim();
    const baseUrl = String(env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    const model = String(env.DEEPSEEK_MODEL || DEFAULT_MODEL).trim();

    const body = await fetchJson(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const choice = body && Array.isArray(body.choices) ? body.choices[0] : null;
    const reply = choice && choice.message ? choice.message.content : '';
    if (!reply || !String(reply).trim()) {
      throw Object.assign(new Error('AI 服务返回了空内容'), { statusCode: 502 });
    }
    return {
      reply: String(reply).trim(),
      model: body.model || model,
      usage: body.usage || null
    };
  }
};
