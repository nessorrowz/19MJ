//Versi prompt dan rubric evaluasi interview.
const INTERVIEW_EVALUATION_PROMPT_VERSION = 'interview-evaluation-v1';
const INTERVIEW_EVALUATION_RUBRIC_VERSION = 'interview-evaluation-rubric-v1';

//Buat prompt evaluasi interview yang wajib mengembalikan JSON.
const buildInterviewEvaluationPrompt = ({
  questionText,
  transcriptText,
}) => [
  'Anda adalah evaluator interview untuk platform 19MJ.',
  'Evaluasi jawaban kandidat berdasarkan pertanyaan interview dan transcript jawaban.',
  '',
  'Return JSON valid saja tanpa markdown dan tanpa penjelasan tambahan.',
  'Schema wajib:',
  '{',
  '  "overallScore": number 0-100,',
  '  "communicationScore": number 0-100,',
  '  "relevanceScore": number 0-100,',
  '  "structureScore": number 0-100,',
  '  "summary": string,',
  '  "strengths": string[],',
  '  "improvements": string[],',
  '  "suggestedAnswer": string',
  '}',
  '',
  'Rubric:',
  '- overallScore menilai kualitas jawaban secara keseluruhan.',
  '- communicationScore menilai kejelasan, pilihan kata, dan kelancaran.',
  '- relevanceScore menilai kesesuaian jawaban dengan pertanyaan.',
  '- structureScore menilai alur jawaban, contoh, dan penutup.',
  '- improvements harus berupa saran konkret yang bisa dipraktikkan.',
  '- suggestedAnswer boleh berupa versi jawaban yang lebih baik dan ringkas.',
  '',
  'Pertanyaan interview:',
  questionText,
  '',
  'Transcript jawaban kandidat:',
  transcriptText,
].join('\n');

module.exports = {
  INTERVIEW_EVALUATION_PROMPT_VERSION,
  INTERVIEW_EVALUATION_RUBRIC_VERSION,
  buildInterviewEvaluationPrompt,
};
