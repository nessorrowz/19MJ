//Repository screening question, answer, dan evaluasi kandidat.
const pool = require('../../config/db');

//Simpan pertanyaan screening dari company.
const createQuestion = async ({
  companyUserId,
  jobId = null,
  questionText,
  rubric = {},
}) => {
  const result = await pool.query(
    `
      INSERT INTO screening_questions (
        company_user_id,
        job_id,
        question_text,
        rubric_json
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [companyUserId, jobId, questionText, rubric]
  );

  return result.rows[0];
};

//Simpan jawaban screening kandidat.
const createAnswer = async ({
  screeningQuestionId,
  candidateUserId,
  answerText,
}) => {
  const result = await pool.query(
    `
      INSERT INTO screening_answers (
        screening_question_id,
        candidate_user_id,
        answer_text
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [screeningQuestionId, candidateUserId, answerText]
  );

  return result.rows[0];
};

//Ambil jawaban screening dengan ownership pertanyaan company.
const getAnswerForCompany = async ({
  companyUserId,
  screeningAnswerId,
}) => {
  const result = await pool.query(
    `
      SELECT
        answer.*,
        question.company_user_id,
        question.job_id,
        question.question_text,
        question.rubric_json
      FROM screening_answers answer
      JOIN screening_questions question
        ON question.id = answer.screening_question_id
      WHERE answer.id = $1
        AND question.company_user_id = $2
    `,
    [screeningAnswerId, companyUserId]
  );

  return result.rows[0] || null;
};

//Simpan evaluasi kandidat hasil validasi AI.
const createCandidateEvaluation = async ({
  companyUserId,
  candidateUserId,
  aiRequestId,
  jobId = null,
  promptVersion,
  inputHash,
  fitScore = null,
  recommendation = null,
  result,
}) => {
  const queryResult = await pool.query(
    `
      INSERT INTO candidate_evaluations (
        company_user_id,
        candidate_user_id,
        ai_request_id,
        job_id,
        prompt_version,
        input_hash,
        fit_score,
        recommendation,
        result_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      companyUserId,
      candidateUserId,
      aiRequestId,
      jobId,
      promptVersion,
      inputHash,
      fitScore,
      recommendation,
      result,
    ]
  );

  return queryResult.rows[0];
};

//Ambil evaluasi kandidat dengan ownership company.
const getCandidateEvaluation = async ({
  companyUserId,
  candidateUserId,
  jobId = null,
}) => {
  const result = await pool.query(
    `
      SELECT *
      FROM candidate_evaluations
      WHERE company_user_id = $1
        AND candidate_user_id = $2
        AND (
          ($3::integer IS NULL AND job_id IS NULL)
          OR job_id = $3
        )
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [companyUserId, candidateUserId, jobId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createQuestion,
  createAnswer,
  getAnswerForCompany,
  createCandidateEvaluation,
  getCandidateEvaluation,
};
