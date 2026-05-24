//Provider OpenRouter untuk fallback gateway LLM.
const { ERROR_CATEGORIES, LlmError, mapHttpStatusToCategory, normalizeProviderError } = require('./llmErrors');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROVIDER = 'openrouter';

//Timeout request OpenRouter dari env.
const getTimeoutMs = () => Number(process.env.OPENROUTER_TIMEOUT_MS || 45000);

const shouldExcludeReasoning = () => process.env.OPENROUTER_EXCLUDE_REASONING !== 'false';

const buildResponseMetadata = (raw) => ({
  responseId: raw?.id || null,
  upstreamProvider: raw?.provider || null,
  usage: raw?.usage ? {
    promptTokens: raw.usage.prompt_tokens ?? null,
    completionTokens: raw.usage.completion_tokens ?? null,
    totalTokens: raw.usage.total_tokens ?? null,
  } : null,
});

//Factory provider OpenRouter dengan validasi API key.
const createOpenRouterProvider = ({ apiKey = process.env.OPENROUTER_API_KEY } = {}) => {
  if (!apiKey) {
    throw new LlmError(ERROR_CATEGORIES.AUTH, 'OPENROUTER_API_KEY belum dikonfigurasi.', { provider: PROVIDER });
  }

  //Generate text melalui OpenRouter chat completions.
  const generateText = async ({
    prompt,
    model = process.env.OPENROUTER_FALLBACK_MODEL || 'deepseek/deepseek-v4-flash:free',
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

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxOutputTokens,
          ...(shouldExcludeReasoning() ? { reasoning: { exclude: true } } : {}),
          ...(responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      const raw = await response.json().catch(() => null);

      if (!response.ok) {
        const category = mapHttpStatusToCategory(response.status);
        const message = category === ERROR_CATEGORIES.INSUFFICIENT_CREDITS
          ? 'OpenRouter credit API key tidak mencukupi.'
          : raw?.error?.message || raw?.message || `OpenRouter mengembalikan status ${response.status}.`;
        const metadata = raw?.error?.metadata || {};
        throw new LlmError(category, message, {
          provider: PROVIDER,
          model,
          status: response.status,
          providerName: metadata.provider_name || null,
          isByok: metadata.is_byok ?? null,
        });
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
        metadata: buildResponseMetadata(raw),
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
