//Validator request publik untuk endpoint AI.
const { z } = require('zod');

const cvReviewRequestSchema = z.object({
  cvText: z.string().trim().min(50).max(Number(process.env.MAX_CV_TEXT_LENGTH || 30000)),
  targetRole: z.string().trim().min(2).max(120).optional(),
});

const careerRoadmapRequestSchema = z.object({
  targetRole: z.string().trim().min(2).max(120),
  currentSkills: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  preferredTimelineWeeks: z.number().int().min(1).max(52).optional(),
});

const interviewSessionRequestSchema = z.object({
  questionText: z.string().trim().min(10).max(2000),
});

const transcriptUpdateRequestSchema = z.object({
  editedTranscript: z.string().trim().min(1).max(Number(process.env.MAX_TRANSCRIPT_TEXT_LENGTH || 20000)),
});

const screeningQuestionRequestSchema = z.object({
  jobId: z.number().int().positive().optional(),
  questionText: z.string().trim().min(10).max(2000),
  rubric: z.record(z.string(), z.unknown()).optional(),
});

const screeningAnswerRequestSchema = z.object({
  screeningQuestionId: z.number().int().positive(),
  answerText: z.string().trim().min(1).max(Number(process.env.MAX_JOB_CONTEXT_LENGTH || 10000)),
});

const candidateEvaluationRequestSchema = z.object({
  screeningAnswerId: z.number().int().positive(),
  jobContext: z.string().trim().max(Number(process.env.MAX_JOB_CONTEXT_LENGTH || 10000)).optional(),
});

const formatZodError = (message, validation) => ({
  message,
  details: validation.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  })),
});

//Validasi body request review CV.
const validateCvReviewRequest = (body) => {
  const validation = cvReviewRequestSchema.safeParse(body);

  if (!validation.success) {
    return {
      error: formatZodError('Input review CV tidak valid.', validation),
      value: null,
    };
  }

  return { error: null, value: validation.data };
};

//Validasi body request career roadmap.
const validateCareerRoadmapRequest = (body) => {
  const validation = careerRoadmapRequestSchema.safeParse(body);

  if (!validation.success) {
    return {
      error: formatZodError('Input career roadmap tidak valid.', validation),
      value: null,
    };
  }

  return { error: null, value: validation.data };
};

//Validasi body request sesi interview.
const validateInterviewSessionRequest = (body) => {
  const validation = interviewSessionRequestSchema.safeParse(body);

  if (!validation.success) {
    return {
      error: formatZodError('Input sesi interview tidak valid.', validation),
      value: null,
    };
  }

  return { error: null, value: validation.data };
};

//Validasi body update transkrip interview.
const validateTranscriptUpdateRequest = (body) => {
  const validation = transcriptUpdateRequestSchema.safeParse(body);

  if (!validation.success) {
    return {
      error: formatZodError('Input update transkrip tidak valid.', validation),
      value: null,
    };
  }

  return { error: null, value: validation.data };
};

//Validasi body pertanyaan screening.
const validateScreeningQuestionRequest = (body) => {
  const validation = screeningQuestionRequestSchema.safeParse(body);

  if (!validation.success) {
    return {
      error: formatZodError('Input pertanyaan screening tidak valid.', validation),
      value: null,
    };
  }

  return { error: null, value: validation.data };
};

//Validasi body jawaban screening.
const validateScreeningAnswerRequest = (body) => {
  const validation = screeningAnswerRequestSchema.safeParse(body);

  if (!validation.success) {
    return {
      error: formatZodError('Input jawaban screening tidak valid.', validation),
      value: null,
    };
  }

  return { error: null, value: validation.data };
};

//Validasi body evaluasi kandidat.
const validateCandidateEvaluationRequest = (body) => {
  const validation = candidateEvaluationRequestSchema.safeParse(body);

  if (!validation.success) {
    return {
      error: formatZodError('Input evaluasi kandidat tidak valid.', validation),
      value: null,
    };
  }

  return { error: null, value: validation.data };
};

module.exports = {
  cvReviewRequestSchema,
  careerRoadmapRequestSchema,
  interviewSessionRequestSchema,
  transcriptUpdateRequestSchema,
  screeningQuestionRequestSchema,
  screeningAnswerRequestSchema,
  candidateEvaluationRequestSchema,
  validateCvReviewRequest,
  validateCareerRoadmapRequest,
  validateInterviewSessionRequest,
  validateTranscriptUpdateRequest,
  validateScreeningQuestionRequest,
  validateScreeningAnswerRequest,
  validateCandidateEvaluationRequest,
};
