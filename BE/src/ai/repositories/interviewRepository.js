//Repository sesi interview, transkrip, dan evaluasi AI.
const pool = require('../../config/db');

const INTERVIEW_SESSION_COLUMNS = `
  id,
  user_id,
  question_text,
  status,
  media_path,
  media_mime_type,
  media_size_bytes,
  error_message,
  metadata_json,
  created_at,
  updated_at
`;

const INTERVIEW_TRANSCRIPT_COLUMNS = `
  id,
  interview_session_id,
  raw_transcript,
  edited_transcript,
  segments_json,
  metadata_json,
  created_at,
  updated_at
`;

//Buat sesi interview kandidat.
const createSession = async ({
  userId,
  questionText,
  metadata = {},
}) => {
  const result = await pool.query(
    `
      INSERT INTO interview_sessions (user_id, question_text, metadata_json)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [userId, questionText, metadata]
  );

  return result.rows[0];
};

//Ambil sesi interview dengan ownership kandidat.
const getSessionByIdForUser = async (id, userId) => {
  const result = await pool.query(
    `
      SELECT ${INTERVIEW_SESSION_COLUMNS}
      FROM interview_sessions
      WHERE id = $1
        AND user_id = $2
    `,
    [id, userId]
  );

  return result.rows[0] || null;
};

//Update status sesi interview.
const updateSessionStatus = async (id, userId, {
  status,
  errorMessage = null,
}) => {
  const result = await pool.query(
    `
      UPDATE interview_sessions
      SET status = $3,
          error_message = $4
      WHERE id = $1
        AND user_id = $2
      RETURNING *
    `,
    [id, userId, status, errorMessage]
  );

  return result.rows[0] || null;
};

//Simpan metadata media interview.
const saveMedia = async (id, userId, {
  mediaPath,
  mediaMimeType,
  mediaSizeBytes,
}) => {
  const result = await pool.query(
    `
      UPDATE interview_sessions
      SET status = 'media_uploaded',
          media_path = $3,
          media_mime_type = $4,
          media_size_bytes = $5
      WHERE id = $1
        AND user_id = $2
      RETURNING *
    `,
    [id, userId, mediaPath, mediaMimeType, mediaSizeBytes]
  );

  return result.rows[0] || null;
};

//Simpan transkrip hasil STT.
const createTranscript = async ({
  interviewSessionId,
  rawTranscript,
  editedTranscript = null,
  segments = [],
  metadata = {},
}) => {
  const result = await pool.query(
    `
      INSERT INTO interview_transcripts (
        interview_session_id,
        raw_transcript,
        edited_transcript,
        segments_json,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [interviewSessionId, rawTranscript, editedTranscript, JSON.stringify(segments), JSON.stringify(metadata)]
  );

  return result.rows[0];
};

//Ganti hasil STT terbaru untuk retry transkripsi sesi yang sama.
const replaceTranscript = async ({
  interviewSessionId,
  rawTranscript,
  editedTranscript = null,
  segments = [],
  metadata = {},
}) => {
  const result = await pool.query(
    `
      UPDATE interview_transcripts
      SET raw_transcript = $2,
          edited_transcript = $3,
          segments_json = $4,
          metadata_json = $5
      WHERE interview_session_id = $1
      RETURNING *
    `,
    [interviewSessionId, rawTranscript, editedTranscript, JSON.stringify(segments), JSON.stringify(metadata)]
  );

  return result.rows[0] || null;
};

//Simpan hasil STT tanpa duplikasi saat endpoint diulang.
const saveTranscript = async ({
  interviewSessionId,
  rawTranscript,
  editedTranscript = null,
  segments = [],
  metadata = {},
}) => {
  try {
    const result = await pool.query(
      `
        INSERT INTO interview_transcripts (
          interview_session_id,
          raw_transcript,
          edited_transcript,
          segments_json,
          metadata_json
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (interview_session_id)
        DO UPDATE SET
          raw_transcript = EXCLUDED.raw_transcript,
          edited_transcript = EXCLUDED.edited_transcript,
          segments_json = EXCLUDED.segments_json,
          metadata_json = EXCLUDED.metadata_json,
          updated_at = NOW()
        RETURNING *
      `,
      [interviewSessionId, rawTranscript, editedTranscript, JSON.stringify(segments), JSON.stringify(metadata)]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code !== '42P10') {
      throw error;
    }

    return saveTranscriptWithSessionLock({
      interviewSessionId,
      rawTranscript,
      editedTranscript,
      segments,
      metadata,
    });
  }
};

//Fallback untuk DB lama yang belum punya unique index transcript.
const saveTranscriptWithSessionLock = async ({
  interviewSessionId,
  rawTranscript,
  editedTranscript = null,
  segments = [],
  metadata = {},
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [interviewSessionId]);

    const existing = await client.query(
      `
        SELECT id
        FROM interview_transcripts
        WHERE interview_session_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [interviewSessionId]
    );

    const values = [interviewSessionId, rawTranscript, editedTranscript, JSON.stringify(segments), JSON.stringify(metadata)];
    const result = existing.rows[0]
      ? await client.query(
        `
          UPDATE interview_transcripts
          SET raw_transcript = $2,
              edited_transcript = $3,
              segments_json = $4,
              metadata_json = $5,
              updated_at = NOW()
          WHERE id = $6
          RETURNING *
        `,
        [...values, existing.rows[0].id]
      )
      : await client.query(
        `
          INSERT INTO interview_transcripts (
            interview_session_id,
            raw_transcript,
            edited_transcript,
            segments_json,
            metadata_json
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        values
      );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

//Ambil transkrip terbaru untuk sesi interview.
const getTranscriptBySessionId = async (interviewSessionId) => {
  const result = await pool.query(
    `
      SELECT ${INTERVIEW_TRANSCRIPT_COLUMNS}
      FROM interview_transcripts
      WHERE interview_session_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [interviewSessionId]
  );

  return result.rows[0] || null;
};

//Update edited transcript tanpa mengubah raw transcript.
const updateTranscript = async ({
  interviewSessionId,
  editedTranscript,
}) => {
  const result = await pool.query(
    `
      UPDATE interview_transcripts
      SET edited_transcript = $2
      WHERE interview_session_id = $1
      RETURNING *
    `,
    [interviewSessionId, editedTranscript]
  );

  return result.rows[0] || null;
};

//Simpan evaluasi interview hasil validasi AI.
const createEvaluation = async ({
  interviewSessionId,
  userId,
  aiRequestId,
  promptVersion,
  inputHash,
  overallScore = null,
  communicationScore = null,
  relevanceScore = null,
  structureScore = null,
  result,
}) => {
  const queryResult = await pool.query(
    `
      INSERT INTO interview_evaluations (
        interview_session_id,
        user_id,
        ai_request_id,
        prompt_version,
        input_hash,
        overall_score,
        communication_score,
        relevance_score,
        structure_score,
        result_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      interviewSessionId,
      userId,
      aiRequestId,
      promptVersion,
      inputHash,
      overallScore,
      communicationScore,
      relevanceScore,
      structureScore,
      JSON.stringify(result),
    ]
  );

  return queryResult.rows[0];
};

// Ambil semua sesi interview milik kandidat lengkap dengan skor evaluasi terakhirnya.
const getAllSessionsForUser = async (userId) => {
  const result = await pool.query(
    `
      SELECT s.*, e.overall_score
      FROM interview_sessions s
      LEFT JOIN (
        SELECT DISTINCT ON (interview_session_id) interview_session_id, overall_score
        FROM interview_evaluations
        ORDER BY interview_session_id, created_at DESC, id DESC
      ) e ON s.id = e.interview_session_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC, s.id DESC
    `,
    [userId]
  );

  return result.rows;
};

// Ambil evaluasi interview terbaru berdasarkan session id.
const getEvaluationBySessionId = async (interviewSessionId, userId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM interview_evaluations
      WHERE interview_session_id = $1 AND user_id = $2
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [interviewSessionId, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createSession,
  getSessionByIdForUser,
  updateSessionStatus,
  saveMedia,
  createTranscript,
  replaceTranscript,
  saveTranscript,
  getTranscriptBySessionId,
  updateTranscript,
  createEvaluation,
  getAllSessionsForUser,
  getEvaluationBySessionId,
};

