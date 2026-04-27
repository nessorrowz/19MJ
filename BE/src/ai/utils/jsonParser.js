//Parser JSON strict untuk output provider AI.
//Error khusus output AI yang gagal diparse sebagai JSON.
class AiJsonParseError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AiJsonParseError';
    this.details = details;
  }
}

//Parse JSON langsung dan tolak wrapper markdown.
const parseStrictJson = (rawText) => {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new AiJsonParseError('Output AI kosong atau bukan string.');
  }

  const trimmedText = rawText.trim();

  if (trimmedText.startsWith('```') || trimmedText.endsWith('```')) {
    throw new AiJsonParseError('Output AI tidak boleh dibungkus markdown.');
  }

  try {
    return JSON.parse(trimmedText);
  } catch (error) {
    throw new AiJsonParseError('Output AI bukan JSON valid.', { cause: error.message });
  }
};

module.exports = {
  AiJsonParseError,
  parseStrictJson,
};
