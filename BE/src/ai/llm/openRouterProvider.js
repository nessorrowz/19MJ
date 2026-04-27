//Provider OpenRouter untuk fallback gateway LLM.
const { ERROR_CATEGORIES, LlmError, mapHttpStatusToCategory, normalizeProviderError } = require('./llmErrors');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROVIDER = 'openrouter';

//Timeout request OpenRouter dari env.
const getTimeoutMs = () => Number(process.env.OPENROUTER_TIMEOUT_MS || 45000);

//Factory provider OpenRouter dengan validasi API key.
const createOpenRouterProvider = ({ apiKey = process.env.OPENROUTER_API_KEY } = {}) => {
  if (!apiKey) {
    throw new LlmError(ERROR_CATEGORIES.AUTH, 'OPENROUTER_API_KEY belum dikonfigurasi.', { provider: PROVIDER });
  }

  //Generate text melalui OpenRouter chat completions.
  const generateText = async ({
    prompt,
    model = process.env.OPENROUTER_FALLBACK_MODEL || 'tencent/hy3-preview:free',
    systemInstruction = null,
    responseMimeType = null,
    maxOutputTokens = Number(process.env.MAX_LLM_OUTPUT_TOKENS || 4000),
  }) => {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
    const messages = [];

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      if (process.env.OPENROUTER_SITE_URL) {
        headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
      }

      if (process.env.OPENROUTER_APP_NAME) {
        headers['X-OpenRouter-Title'] = process.env.OPENROUTER_APP_NAME;
      }

      //TODO: Replace tencent/hy3-preview:free after May 8, 2026 because OpenRouter marks the free variant as going away.
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxOutputTokens,
          ...(responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      const raw = await response.json().catch(() => null);

      if (!response.ok) {
        const category = mapHttpStatusToCategory(response.status);
        const message = raw?.error?.message || raw?.message || `OpenRouter mengembalikan status ${response.status}.`;
        throw new LlmError(category, message, { provider: PROVIDER, model, status: response.status });
      }

      const text = raw?.choices?.[0]?.message?.content;
      if (!text || typeof text !== 'string') {
        throw new LlmError(ERROR_CATEGORIES.INVALID_RESPONSE, 'OpenRouter tidak mengembalikan teks.', {
          provider: PROVIDER,
          model,
        });
      }

      return {
        text,
        raw,
        provider: PROVIDER,
        model,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      throw normalizeProviderError(error, { provider: PROVIDER, model });
    } finally {
      clearTimeout(timeout);
    }
  };

  return { generateText };
};

module.exports = { createOpenRouterProvider };
