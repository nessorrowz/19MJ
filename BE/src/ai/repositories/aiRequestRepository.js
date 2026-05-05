//Repository audit request AI.
const pool = require('../../config/db');

//Buat audit request sebelum provider dipanggil.
const createPending = async ({
  userId,
  feature,
  promptVersion,
  inputHash = null,
  cacheKey = null,
  inputSizeChars = null,
  metadata = {},
}) => {
  const result = await pool.query(
    `
      INSERT INTO ai_requests (
        user_id,
        feature,
        prompt_version,
        input_hash,
        cache_key,
        input_size_chars,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [userId, feature, promptVersion, inputHash, cacheKey, inputSizeChars, metadata]
  );

  return result.rows[0];
};

//Tandai request AI berhasil dari provider.
const markSucceeded = async (id, {
  provider,
  model,
  latencyMs,
  outputSizeChars = null,
  attemptCount = 1,
  metadata = {},
}) => {
  const result = await pool.query(
    `
      UPDATE ai_requests
      SET status = 'succeeded',
          provider = $2,
          model = $3,
          latency_ms = $4,
          output_size_chars = $5,
          attempt_count = $6,
          metadata_json = metadata_json || $7::jsonb,
          completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, provider, model, latencyMs, outputSizeChars, attemptCount, metadata]
  );

  return result.rows[0] || null;
};

//Tandai request AI memakai cache tanpa provider call.
const markCacheHit = async (id, {
  outputSizeChars = null,
  metadata = {},
} = {}) => {
  const result = await pool.query(
    `
      UPDATE ai_requests
      SET status = 'succeeded',
          cache_hit = TRUE,
          output_size_chars = $2,
          attempt_count = 0,
          metadata_json = metadata_json || $3::jsonb,
          completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, outputSizeChars, metadata]
  );

  return result.rows[0] || null;
};

//Tandai request AI gagal dengan kategori error.
const markFailed = async (id, {
  errorCategory,
  errorMessage,
  provider = null,
  model = null,
  latencyMs = null,
  attemptCount = 1,
  metadata = {},
}) => {
  const result = await pool.query(
    `
      UPDATE ai_requests
      SET status = 'failed',
          provider = COALESCE($2, provider),
          model = COALESCE($3, model),
          latency_ms = $4,
          attempt_count = $5,
          error_category = $6,
          error_message = $7,
          metadata_json = metadata_json || $8::jsonb,
          completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, provider, model, latencyMs, attemptCount, errorCategory, errorMessage, metadata]
  );

  return result.rows[0] || null;
};

module.exports = {
  createPending,
  markSucceeded,
  markCacheHit,
  markFailed,
};
