//Terapkan index AI yang aman untuk database existing.
require('dotenv').config();
const pool = require('../src/config/db');

const INDEX_STATEMENTS = [
  `
    CREATE INDEX IF NOT EXISTS idx_cv_reviews_cache_lookup
      ON cv_reviews(user_id, input_hash, prompt_version, created_at DESC, id DESC)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_career_roadmaps_cache_lookup
      ON career_roadmaps(user_id, input_hash, prompt_version, created_at DESC, id DESC)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_interview_evaluations_cache_lookup
      ON interview_evaluations(user_id, input_hash, prompt_version, created_at DESC, id DESC)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_candidate_evaluations_cache_lookup
      ON candidate_evaluations(company_user_id, input_hash, prompt_version, created_at DESC, id DESC)
  `,
];

const getTranscriptDuplicateCount = async () => {
  const result = await pool.query(`
    SELECT COUNT(*)::integer AS duplicate_session_count
    FROM (
      SELECT interview_session_id
      FROM interview_transcripts
      GROUP BY interview_session_id
      HAVING COUNT(*) > 1
    ) duplicate_sessions
  `);

  return result.rows[0]?.duplicate_session_count || 0;
};

const applyIndexes = async () => {
  const startedAt = Date.now();
  const applied = [];

  for (const statement of INDEX_STATEMENTS) {
    await pool.query(statement);
    applied.push(statement.match(/idx_[a-z_]+/)?.[0] || 'unknown_index');
  }

  const duplicateSessionCount = await getTranscriptDuplicateCount();
  let transcriptUniqueIndexApplied = false;

  if (duplicateSessionCount === 0) {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_transcripts_one_per_session
        ON interview_transcripts(interview_session_id)
    `);
    transcriptUniqueIndexApplied = true;
  }

  return {
    appliedIndexCount: applied.length + (transcriptUniqueIndexApplied ? 1 : 0),
    cacheIndexCount: applied.length,
    transcriptUniqueIndexApplied,
    duplicateTranscriptSessionCount: duplicateSessionCount,
    latencyMs: Date.now() - startedAt,
  };
};

applyIndexes()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
