//Provider Google Gemini untuk gateway LLM.
const { GoogleGenAI } = require('@google/genai');
const { ERROR_CATEGORIES, LlmError, normalizeProviderError } = require('./llmErrors');

const PROVIDER = 'google';

//Timeout request Google dari env.
const getTimeoutMs = () => Number(process.env.GOOGLE_LLM_TIMEOUT_MS || 45000);

//Config request Google untuk output biasa atau JSON.
const buildConfig = ({ systemInstruction, responseMimeType, responseSchema, maxOutputTokens }) => {
  const config = {};

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  if (responseSchema) {
    config.responseSchema = responseSchema;
  }

  if (maxOutputTokens) {
    config.maxOutputTokens = maxOutputTokens;
  }

  return config;
};

//Factory provider Google dengan validasi API key.
const createGoogleProvider = ({ apiKey = process.env.GOOGLE_AI_API_KEY } = {}) => {
  if (!apiKey) {
    throw new LlmError(ERROR_CATEGORIES.AUTH, 'GOOGLE_AI_API_KEY belum dikonfigurasi.', { provider: PROVIDER });
  }

  const client = new GoogleGenAI({ apiKey });

  //Generate text melalui Google Gemini.
  const generateText = async ({
    prompt,
    model = process.env.GOOGLE_LLM_PRIMARY_MODEL || 'gemini-3.1-flash-lite-preview',
    systemInstruction = null,
    responseMimeType = null,
    responseSchema = null,
    maxOutputTokens = Number(process.env.MAX_LLM_OUTPUT_TOKENS || 4000),
  }) => {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: buildConfig({ systemInstruction, responseMimeType, responseSchema, maxOutputTokens }),
        signal: controller.signal,
      });

      const text = response.text;
      if (!text || typeof text !== 'string') {
        throw new LlmError(ERROR_CATEGORIES.INVALID_RESPONSE, 'Google LLM tidak mengembalikan teks.', {
          provider: PROVIDER,
          model,
        });
      }

      return {
        text,
        raw: response,
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

module.exports = { createGoogleProvider };
