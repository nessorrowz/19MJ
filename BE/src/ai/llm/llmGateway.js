//Gateway provider LLM terpusat untuk service fitur.
const { createGoogleProvider } = require('./googleProvider');
const { createOpenRouterProvider } = require('./openRouterProvider');
const { ERROR_CATEGORIES, LlmError, isRetryableLlmError } = require('./llmErrors');

const defaultProviderFactories = {
  google: createGoogleProvider,
  openrouter: createOpenRouterProvider,
};

//Plan urutan provider dan model dari env.
const buildProviderPlan = (providerFactories = defaultProviderFactories) => [
  {
    provider: 'google',
    model: process.env.GOOGLE_LLM_PRIMARY_MODEL || 'gemini-3.1-flash-lite-preview',
    factory: providerFactories.google,
  },
  {
    provider: 'google',
    model: process.env.GOOGLE_LLM_SECONDARY_MODEL || 'gemma-4-31b-it',
    factory: providerFactories.google,
  },
  {
    provider: 'openrouter',
    model: process.env.OPENROUTER_FALLBACK_MODEL || 'deepseek/deepseek-v4-flash:free',
    factory: providerFactories.openrouter,
  },
  {
    provider: 'openrouter',
    model: process.env.OPENROUTER_SECONDARY_FALLBACK_MODEL || 'deepseek/deepseek-v4-flash:free',
    factory: providerFactories.openrouter,
  },
];

//Gateway per provider dan fallback untuk repeated error.
const createLlmGateway = ({ providerFactories = defaultProviderFactories } = {}) => {
  const providerCache = new Map();

  const getProvider = (step) => {
    if (!providerCache.has(step.provider)) {
      providerCache.set(step.provider, step.factory());
    }

    return providerCache.get(step.provider);
  };

  //Generate text dan simpan metadata attempt gagal.
  const generateText = async (input) => {
    const attempts = [];

    for (const step of buildProviderPlan(providerFactories)) {
      try {
        const provider = getProvider(step);
        const result = await provider.generateText({ ...input, model: step.model });
        return {
          ...result,
          attempts,
        };
      } catch (error) {
        attempts.push({
          provider: step.provider,
          model: step.model,
          category: error.category || ERROR_CATEGORIES.NETWORK,
          message: error.message,
        });

        if (!isRetryableLlmError(error)) {
          throw error;
        }
      }
    }

    throw new LlmError(ERROR_CATEGORIES.ALL_FAILED, 'Semua provider LLM gagal.', { attempts });
  };

  return { generateText };
};

module.exports = {
  createLlmGateway,
  buildProviderPlan,
};
