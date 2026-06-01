//Repository dokumen kandidat untuk input AI.
const pool = require('../../config/db');

const CANDIDATE_DOCUMENT_COLUMNS = `
  id,
  user_id,
  document_type,
  source_type,
  original_filename,
  storage_path,
  content_text,
  content_hash,
  metadata_json,
  created_at,
  updated_at
`;

//Simpan metadata dan teks dokumen kandidat.
const create = async ({
  userId,
  documentType,
  sourceType = 'text',
  originalFilename = null,
  storagePath = null,
  contentText = null,
  contentHash = null,
  metadata = {},
}) => {
  const result = await pool.query(
    `
      INSERT INTO candidate_documents (
        user_id,
        document_type,
        source_type,
        original_filename,
        storage_path,
        content_text,
        content_hash,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [userId, documentType, sourceType, originalFilename, storagePath, contentText, contentHash, metadata]
  );

  return result.rows[0];
};

//Ambil dokumen dengan ownership kandidat.
const findByIdForUser = async (id, userId) => {
  const result = await pool.query(
    `
      SELECT ${CANDIDATE_DOCUMENT_COLUMNS}
      FROM candidate_documents
      WHERE id = $1
        AND user_id = $2
    `,
    [id, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  create,
  findByIdForUser,
};
