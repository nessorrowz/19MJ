//Validator structured output AI sebelum disimpan ke database.
const { z } = require('zod');

const scoreSchema = z.number().int().min(0).max(100);

const shortTextSchema = z.string().trim().min(1).max(500);
const mediumTextSchema = z.string().trim().min(1).max(2000);

const cvReviewSchema = z.object({
  overallScore: scoreSchema,
  summary: mediumTextSchema,
  strengths: z.array(shortTextSchema).min(1).max(8),
  weaknesses: z.array(shortTextSchema).min(1).max(8),
  improvementSuggestions: z.array(shortTextSchema).min(1).max(10),
  keywordGaps: z.array(shortTextSchema).max(20).default([]),
  recommendedRoles: z.array(shortTextSchema).max(10).default([]),
});

const careerRoadmapSchema = z.object({
  targetRole: shortTextSchema,
  readinessScore: scoreSchema,
  summary: mediumTextSchema,
  skillGaps: z.array(shortTextSchema).min(1).max(20),
  phases: z.array(z.object({
    title: shortTextSchema,
    durationWeeks: z.number().int().min(1).max(52),
    focus: mediumTextSchema,
    tasks: z.array(shortTextSchema).min(1).max(10),
    deliverables: z.array(shortTextSchema).min(1).max(10),
  })).min(1).max(8),
});

const interviewEvaluationSchema = z.object({
  overallScore: scoreSchema,
  communicationScore: scoreSchema,
  relevanceScore: scoreSchema,
  structureScore: scoreSchema,
  summary: mediumTextSchema,
  strengths: z.array(shortTextSchema).min(1).max(8),
  improvements: z.array(shortTextSchema).min(1).max(10),
  suggestedAnswer: mediumTextSchema.optional(),
});

const candidateEvaluationSchema = z.object({
  fitScore: scoreSchema,
  recommendation: z.enum(['advance', 'hold', 'reject']),
  summary: mediumTextSchema,
  strengths: z.array(shortTextSchema).min(1).max(8),
  risks: z.array(shortTextSchema).max(8).default([]),
  interviewFocusAreas: z.array(shortTextSchema).max(10).default([]),
});

const resultSchemas = {
  cv_review: cvReviewSchema,
  career_roadmap: careerRoadmapSchema,
  interview_evaluation: interviewEvaluationSchema,
  candidate_evaluation: candidateEvaluationSchema,
};

//Error khusus hasil AI yang tidak sesuai schema.
class AiValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AiValidationError';
    this.details = details;
  }
}

//Validasi hasil AI berdasarkan feature.
const validateAiResult = (feature, payload) => {
  const schema = resultSchemas[feature];

  if (!schema) {
    throw new AiValidationError('Validator hasil AI tidak ditemukan.', { feature });
  }

  const validation = schema.safeParse(payload);

  if (!validation.success) {
    throw new AiValidationError('Hasil AI tidak sesuai schema.', {
      feature,
      issues: validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  return validation.data;
};

module.exports = {
  AiValidationError,
  resultSchemas,
  validateAiResult,
  cvReviewSchema,
  careerRoadmapSchema,
  interviewEvaluationSchema,
  candidateEvaluationSchema,
};
