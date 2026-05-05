//Error LLM terstandar untuk semua provider.
const ERROR_CATEGORIES = {
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  PROVIDER_5XX: 'provider_5xx',
  NETWORK: 'network',
  INVALID_RESPONSE: 'invalid_response',
  AUTH: 'auth',
  BAD_REQUEST: 'bad_request',
  ALL_FAILED: 'all_failed',
};

//Error internal gateway dengan kategori yang bisa diaudit.
class LlmError extends Error {
  constructor(category, message, details = {}) {
    super(message);
    this.name = 'LlmError';
    this.category = category;
    this.details = details;
  }
}

//Cek apakah error aman untuk fallback ke provider berikutnya.
const isRetryableLlmError = (error) =>
  error instanceof LlmError && [
    ERROR_CATEGORIES.RATE_LIMIT,
    ERROR_CATEGORIES.TIMEOUT,
    ERROR_CATEGORIES.PROVIDER_5XX,
    ERROR_CATEGORIES.NETWORK,
    ERROR_CATEGORIES.INVALID_RESPONSE,
  ].includes(error.category);

//Mapping status HTTP provider ke kategori internal.
const mapHttpStatusToCategory = (status) => {
  if (status === 401 || status === 403) {
    return ERROR_CATEGORIES.AUTH;
  }

  if (status === 408 || status === 504) {
    return ERROR_CATEGORIES.TIMEOUT;
  }

  if (status === 429) {
    return ERROR_CATEGORIES.RATE_LIMIT;
  }

  if (status >= 500) {
    return ERROR_CATEGORIES.PROVIDER_5XX;
  }

  return ERROR_CATEGORIES.BAD_REQUEST;
};

//Normalisasi error provider menjadi LlmError.
const normalizeProviderError = (error, details = {}) => {
  if (error instanceof LlmError) {
    return error;
  }

  if (error?.name === 'AbortError') {
    return new LlmError(ERROR_CATEGORIES.TIMEOUT, 'Provider LLM melewati batas waktu.', details);
  }

  if (error?.status || error?.code) {
    const status = Number(error.status || error.code);
    if (Number.isFinite(status)) {
      return new LlmError(
        mapHttpStatusToCategory(status),
        error.message || `Provider LLM mengembalikan status ${status}.`,
        { ...details, status }
      );
    }
  }

  return new LlmError(
    ERROR_CATEGORIES.NETWORK,
    error?.message || 'Provider LLM gagal dihubungi.',
    details
  );
};

module.exports = {
  ERROR_CATEGORIES,
  LlmError,
  isRetryableLlmError,
  mapHttpStatusToCategory,
  normalizeProviderError,
};
