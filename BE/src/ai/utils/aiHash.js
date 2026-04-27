//Utility hash deterministik untuk input AI dan versi prompt.
const crypto = require('crypto');
const { normalizeText } = require('./textNormalization');

//Stringify object dengan urutan key stabil.
const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`;
  }

  return JSON.stringify(value);
};

//Buat hash input AI berdasarkan feature, versi prompt, dan input.
const createAiHash = ({
  feature,
  promptVersion,
  rubricVersion = null,
  input,
}) => {
  const payload = {
    feature,
    promptVersion,
    rubricVersion,
    input: typeof input === 'string' ? normalizeText(input) : input,
  };

  return crypto
    .createHash('sha256')
    .update(stableStringify(payload))
    .digest('hex');
};

module.exports = {
  createAiHash,
  stableStringify,
};
