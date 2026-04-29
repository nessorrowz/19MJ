//Logger operasional AI tanpa konten sensitif.
const SAFE_LOG_FIELDS = new Set([
  'feature',
  'provider',
  'model',
  'latencyMs',
  'status',
  'cacheHit',
  'attemptCount',
  'errorCategory',
]);

//Log metadata aman untuk observability AI.
const logAiEvent = (event, metadata = {}) => {
  const safeMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SAFE_LOG_FIELDS.has(key)) {
      safeMetadata[key] = value;
    }
  }

  console.info(JSON.stringify({
    event,
    ...safeMetadata,
  }));
};

module.exports = {
  SAFE_LOG_FIELDS,
  logAiEvent,
};
