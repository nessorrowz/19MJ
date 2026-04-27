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

module.exports = {
  cvReviewRequestSchema,
  careerRoadmapRequestSchema,
  validateCvReviewRequest,
  validateCareerRoadmapRequest,
};
