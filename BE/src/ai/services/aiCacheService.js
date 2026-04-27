//Service cache hasil AI tervalidasi.
const pool = require('../../config/db');

const FEATURE_CACHE_SOURCES = {
  cv_review: { table: 'cv_reviews', ownerColumn: 'user_id' },
  career_roadmap: { table: 'career_roadmaps', ownerColumn: 'user_id' },
  interview_evaluation: { table: 'interview_evaluations', ownerColumn: 'user_id' },
  candidate_evaluation: { table: 'candidate_evaluations', ownerColumn: 'company_user_id' },
};

//Ambil cache hanya dari hasil sukses dan owner yang sama.
const getCachedResult = async ({
  userId,
  feature,
  inputHash,
  promptVersion,
}) => {
  const source = FEATURE_CACHE_SOURCES[feature];

  if (!source) {
    throw new Error(`Feature cache AI tidak dikenal: ${feature}`);
  }

  //Cache hanya boleh dipakai dari hasil yang sudah tervalidasi dan sukses.
  const result = await pool.query(
    `
      SELECT feature_result.result_json, feature_result.ai_request_id, feature_result.created_at
      FROM ${source.table} feature_result
      JOIN ai_requests request
        ON request.id = feature_result.ai_request_id
       AND request.status = 'succeeded'
      WHERE feature_result.${source.ownerColumn} = $1
        AND feature_result.input_hash = $2
        AND feature_result.prompt_version = $3
      ORDER BY feature_result.created_at DESC, feature_result.id DESC
      LIMIT 1
    `,
    [userId, inputHash, promptVersion]
  );

  return result.rows[0] || null;
};

module.exports = {
  getCachedResult,
};
