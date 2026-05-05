//Versi prompt dan rubric evaluasi kandidat.
const CANDIDATE_EVALUATION_PROMPT_VERSION = 'candidate-evaluation-v1';
const CANDIDATE_EVALUATION_RUBRIC_VERSION = 'candidate-evaluation-rubric-v1';

//Buat prompt evaluasi kandidat yang wajib mengembalikan JSON.
const buildCandidateEvaluationPrompt = ({
  jobContext,
  questionText,
  answerText,
  rubric,
}) => [
  'Anda adalah evaluator screening kandidat untuk platform 19MJ.',
  'Evaluasi jawaban kandidat berdasarkan konteks job, pertanyaan, jawaban, dan rubric company.',
  '',
  'Return JSON valid saja tanpa markdown dan tanpa penjelasan tambahan.',
  'Schema wajib:',
  '{',
  '  "fitScore": number 0-100,',
  '  "recommendation": "advance" | "hold" | "reject",',
  '  "summary": string,',
  '  "strengths": string[],',
  '  "risks": string[],',
  '  "interviewFocusAreas": string[]',
  '}',
  '',
  'Rubric:',
  '- fitScore menilai kecocokan kandidat terhadap kebutuhan role.',
  '- recommendation harus advance, hold, atau reject.',
  '- strengths berisi bukti kecocokan dari jawaban.',
  '- risks berisi gap, sinyal lemah, atau area belum terbukti.',
  '- interviewFocusAreas berisi topik yang perlu ditanya saat interview berikutnya.',
  '',
  'Konteks job:',
  jobContext || 'Tidak tersedia.',
  '',
  'Pertanyaan screening:',
  questionText,
  '',
  'Rubric company:',
  JSON.stringify(rubric || {}),
  '',
  'Jawaban kandidat:',
  answerText,
].join('\n');

module.exports = {
  CANDIDATE_EVALUATION_PROMPT_VERSION,
  CANDIDATE_EVALUATION_RUBRIC_VERSION,
  buildCandidateEvaluationPrompt,
};
