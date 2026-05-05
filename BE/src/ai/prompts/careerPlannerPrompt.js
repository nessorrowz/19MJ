//Versi prompt dan rubric career planner.
const CAREER_PLANNER_PROMPT_VERSION = 'career-planner-v1';
const CAREER_PLANNER_RUBRIC_VERSION = 'career-planner-rubric-v1';

//Buat prompt roadmap yang wajib mengembalikan JSON.
const buildCareerPlannerPrompt = ({
  targetRole,
  currentSkills,
  preferredTimelineWeeks = null,
  cvReviewSummary = null,
}) => [
  'Anda adalah career planner untuk platform 19MJ.',
  'Buat roadmap belajar yang realistis untuk target role berikut:',
  targetRole,
  '',
  `Current skills: ${currentSkills.join(', ')}`,
  `Preferred timeline weeks: ${preferredTimelineWeeks || 'fleksibel'}`,
  `Latest CV review summary: ${cvReviewSummary || 'tidak tersedia'}`,
  '',
  'Return JSON valid saja tanpa markdown dan tanpa penjelasan tambahan.',
  'Schema wajib:',
  '{',
  '  "targetRole": string,',
  '  "readinessScore": number 0-100,',
  '  "summary": string,',
  '  "skillGaps": string[],',
  '  "phases": [',
  '    {',
  '      "title": string,',
  '      "durationWeeks": number,',
  '      "focus": string,',
  '      "tasks": string[],',
  '      "deliverables": string[]',
  '    }',
  '  ]',
  '}',
  '',
  'Rubric:',
  '- readinessScore menilai jarak kandidat dari target role.',
  '- skillGaps berisi gap teknis dan non-teknis paling penting.',
  '- phases harus berurutan, terukur, dan sesuai timeline jika diberikan.',
  '- tasks harus konkret dan bisa dikerjakan.',
  '- deliverables harus berupa bukti hasil belajar atau proyek.',
].join('\n');

module.exports = {
  CAREER_PLANNER_PROMPT_VERSION,
  CAREER_PLANNER_RUBRIC_VERSION,
  buildCareerPlannerPrompt,
};
