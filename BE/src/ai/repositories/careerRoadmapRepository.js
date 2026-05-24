//Repository hasil career roadmap AI.
const pool = require('../../config/db');

const CAREER_ROADMAP_COLUMNS = `
  id,
  user_id,
  ai_request_id,
  target_role,
  prompt_version,
  input_hash,
  timeline_weeks,
  result_json,
  created_at
`;

//Simpan roadmap hasil validasi AI.
const create = async ({
  userId,
  aiRequestId,
  targetRole,
  promptVersion,
  inputHash,
  timelineWeeks = null,
  result,
}) => {
  const queryResult = await pool.query(
    `
      INSERT INTO career_roadmaps (
        user_id,
        ai_request_id,
        target_role,
        prompt_version,
        input_hash,
        timeline_weeks,
        result_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [userId, aiRequestId, targetRole, promptVersion, inputHash, timelineWeeks, result]
  );

  return queryResult.rows[0];
};

//Ambil roadmap terbaru milik user.
const getLatestForUser = async (userId) => {
  const result = await pool.query(
    `
      SELECT ${CAREER_ROADMAP_COLUMNS}
      FROM career_roadmaps
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

//Ambil roadmap berdasarkan id dan ownership user.
const getByIdForUser = async (id, userId) => {
  const result = await pool.query(
    `
      SELECT ${CAREER_ROADMAP_COLUMNS}
      FROM career_roadmaps
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
