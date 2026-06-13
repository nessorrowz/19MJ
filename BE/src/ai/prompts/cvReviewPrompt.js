//Versi prompt dan rubric review CV.
const CV_REVIEW_PROMPT_VERSION = 'cv-review-v1';
const CV_REVIEW_RUBRIC_VERSION = 'cv-review-rubric-v1';

//Buat prompt review CV yang wajib mengembalikan JSON.
const buildCvReviewPrompt = ({
  cvText,
  targetRole,
}) => [
  'Anda adalah reviewer CV untuk platform 19MJ.',
  'Nilai CV kandidat secara objektif untuk target role berikut:',
  targetRole || 'role yang relevan dengan isi CV',
  '',
  'Return JSON valid saja tanpa markdown dan tanpa penjelasan tambahan.',
  'Schema wajib:',
  '{',
  '  "overallScore": number 0-100,',
  '  "summary": string,',
  '  "strengths": string[],',
  '  "weaknesses": string[],',
  '  "improvementSuggestions": string[],',
  '  "keywordGaps": string[],',
  '  "recommendedRoles": string[]',
  '}',
  '',
  'Rubric:',
  '- overallScore menilai relevansi role, struktur CV, dampak pengalaman, keyword teknis, dan kejelasan pencapaian.',
  '- strengths berisi hal yang sudah kuat.',
  '- weaknesses berisi kelemahan utama CV.',
  '- improvementSuggestions berisi aksi konkret untuk memperbaiki CV.',
  '- keywordGaps berisi keyword skill/tools yang relevan tetapi belum terlihat.',
  '- recommendedRoles berisi role realistis berdasarkan isi CV.',
  '',
  'CV kandidat:',
  cvText,
].join('\n');

module.exports = {
  CV_REVIEW_PROMPT_VERSION,
  CV_REVIEW_RUBRIC_VERSION,
  buildCvReviewPrompt,
};
