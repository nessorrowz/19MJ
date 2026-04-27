//Repository hasil review CV AI.
const pool = require('../../config/db');

//Simpan review CV hasil validasi AI.
const create = async ({
  userId,
  aiRequestId,
  documentId,
  targetRole = null,
  promptVersion,
  inputHash,
  overallScore = null,
  atsScore = null,
  result,
}) => {
  const queryResult = await pool.query(
    `
      INSERT INTO cv_reviews (
        user_id,
        ai_request_id,
        document_id,
        target_role,
        prompt_version,
        input_hash,
        overall_score,
        ats_score,
        result_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [userId, aiRequestId, documentId, targetRole, promptVersion, inputHash, overallScore, atsScore, result]
  );

  return queryResult.rows[0];
};

//Ambil review CV terbaru milik user.
const getLatestForUser = async (userId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM cv_reviews
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

//Ambil review CV berdasarkan id dan ownership user.
const getByIdForUser = async (id, userId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM cv_reviews
      WHERE id = $1
        AND user_id = $2
    `,
    [id, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  create,
  getLatestForUser,
  getByIdForUser,
};
