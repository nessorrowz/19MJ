//Service limit karakter untuk mencegah input AI terlalu besar.
const LIMITS = {
  cvText: {
    env: 'MAX_CV_TEXT_LENGTH',
    fallback: 30000,
    label: 'CV',
  },
  profileContext: {
    env: 'MAX_PROFILE_CONTEXT_LENGTH',
    fallback: 8000,
    label: 'konteks profil',
  },
  transcriptText: {
    env: 'MAX_TRANSCRIPT_TEXT_LENGTH',
    fallback: 20000,
    label: 'transkrip',
  },
  jobContext: {
    env: 'MAX_JOB_CONTEXT_LENGTH',
    fallback: 10000,
    label: 'konteks pekerjaan',
  },
};

//Error khusus input AI yang melewati budget.
class AiBudgetError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'AiBudgetError';
    this.code = 'ai_budget_exceeded';
    this.details = details;
  }
}

//Ambil limit karakter dari env atau fallback.
const getLimit = (limitKey) => {
  const config = LIMITS[limitKey];

  if (!config) {
    throw new Error(`Limit AI tidak dikenal: ${limitKey}`);
  }

  const value = Number(process.env[config.env] || config.fallback);
  return Number.isFinite(value) && value > 0 ? value : config.fallback;
};

//Validasi panjang input sebelum provider dipanggil.
const assertWithinLimit = (limitKey, value) => {
  const text = String(value || '');
  const maxChars = getLimit(limitKey);

  if (text.length > maxChars) {
    const config = LIMITS[limitKey];
    throw new AiBudgetError(`${config.label} terlalu panjang. Maksimal ${maxChars} karakter.`, {
      limitKey,
      maxChars,
      actualChars: text.length,
    });
  }

  return {
    maxChars,
    actualChars: text.length,
  };
};

module.exports = {
  AiBudgetError,
  assertWithinLimit,
  getLimit,
};
