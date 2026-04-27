//Service orchestration AI Career Roadmap.
const { createLlmGateway } = require('../llm/llmGateway');
const { ERROR_CATEGORIES, LlmError } = require('../llm/llmErrors');
const aiRequestRepository = require('../repositories/aiRequestRepository');
const careerRoadmapRepository = require('../repositories/careerRoadmapRepository');
const cvReviewRepository = require('../repositories/cvReviewRepository');
const { getCachedResult } = require('./aiCacheService');
const { assertWithinLimit } = require('./aiBudgetService');
const { parseAndValidateAiOutput } = require('./aiOutputService');
const { createAiHash } = require('../utils/aiHash');
const { normalizeText } = require('../utils/textNormalization');
const {
  CAREER_PLANNER_PROMPT_VERSION,
  CAREER_PLANNER_RUBRIC_VERSION,
  buildCareerPlannerPrompt,
} = require('../prompts/careerPlannerPrompt');
const { AiServiceError } = require('./cvReviewService');

const FEATURE = 'career_roadmap';

const defaultDependencies = {
  aiRequestRepository,
  careerRoadmapRepository,
  cvReviewRepository,
  getCachedResult,
  createLlmGateway,
};

const mapProviderErrorStatus = (error) => {
  if (error instanceof LlmError && error.category === ERROR_CATEGORIES.INVALID_RESPONSE) {
    return 422;
  }

  return 503;
};

//Ringkas review CV terbaru agar prompt tidak membawa seluruh hasil lama.
const buildCvReviewSummary = (cvReview) => {
  if (!cvReview?.result_json) {
    return null;
  }

  const result = cvReview.result_json;
  const parts = [
    result.summary,
    result.overallScore !== undefined ? `Overall score: ${result.overallScore}` : null,
    Array.isArray(result.weaknesses) ? `Weaknesses: ${result.weaknesses.slice(0, 3).join('; ')}` : null,
    Array.isArray(result.keywordGaps) ? `Keyword gaps: ${result.keywordGaps.slice(0, 5).join('; ')}` : null,
  ].filter(Boolean);

  return normalizeText(parts.join('\n'));
};

//Buat roadmap karier baru atau ambil cache jika input identik.
const createCareerRoadmap = async ({
  userId,
  targetRole,
  currentSkills,
  preferredTimelineWeeks = null,
  dependencies = defaultDependencies,
}) => {
  if (!userId) {
    throw new AiServiceError(401, 'User belum terautentikasi.');
  }

  const normalizedTargetRole = normalizeText(targetRole);
  const normalizedSkills = currentSkills.map((skill) => normalizeText(skill));
  const latestCvReview = await dependencies.cvReviewRepository.getLatestForUser(userId);
  const cvReviewSummary = buildCvReviewSummary(latestCvReview);
  const profileContext = normalizeText([
    `Target role: ${normalizedTargetRole}`,
    `Current skills: ${normalizedSkills.join(', ')}`,
    preferredTimelineWeeks ? `Timeline weeks: ${preferredTimelineWeeks}` : null,
    cvReviewSummary ? `CV review: ${cvReviewSummary}` : null,
  ].filter(Boolean).join('\n'));

  assertWithinLimit('profileContext', profileContext);

  const inputHash = createAiHash({
    feature: FEATURE,
    promptVersion: CAREER_PLANNER_PROMPT_VERSION,
    rubricVersion: CAREER_PLANNER_RUBRIC_VERSION,
    input: {
      targetRole: normalizedTargetRole,
      currentSkills: normalizedSkills,
      preferredTimelineWeeks,
      cvReviewSummary,
    },
  });

  const cached = await dependencies.getCachedResult({
    userId,
    feature: FEATURE,
    inputHash,
    promptVersion: CAREER_PLANNER_PROMPT_VERSION,
  });

  if (cached) {
    const audit = await dependencies.aiRequestRepository.createPending({
      userId,
      feature: FEATURE,
      promptVersion: CAREER_PLANNER_PROMPT_VERSION,
      inputHash,
      cacheKey: inputHash,
      inputSizeChars: profileContext.length,
      metadata: { source: 'cache_lookup' },
    });

    await dependencies.aiRequestRepository.markCacheHit(audit.id, {
      outputSizeChars: JSON.stringify(cached.result_json).length,
      metadata: { cachedAiRequestId: cached.ai_request_id },
    });

    return {
      cached: true,
      roadmap: cached.result_json,
      aiRequestId: audit.id,
    };
  }

  const audit = await dependencies.aiRequestRepository.createPending({
    userId,
    feature: FEATURE,
    promptVersion: CAREER_PLANNER_PROMPT_VERSION,
    inputHash,
    cacheKey: inputHash,
    inputSizeChars: profileContext.length,
    metadata: {
      rubricVersion: CAREER_PLANNER_RUBRIC_VERSION,
      targetRole: normalizedTargetRole,
      preferredTimelineWeeks,
      hasCvReview: Boolean(cvReviewSummary),
    },
  });

  try {
    const gateway = dependencies.createLlmGateway();
    const llmResult = await gateway.generateText({
      prompt: buildCareerPlannerPrompt({
        targetRole: normalizedTargetRole,
        currentSkills: normalizedSkills,
        preferredTimelineWeeks,
        cvReviewSummary,
      }),
      responseMimeType: 'application/json',
    });
    const validatedResult = await parseAndValidateAiOutput({
      feature: FEATURE,
      rawText: llmResult.text,
      llmGateway: gateway,
      allowRepair: true,
    });
    const savedRoadmap = await dependencies.careerRoadmapRepository.create({
      userId,
      aiRequestId: audit.id,
      targetRole: normalizedTargetRole,
      promptVersion: CAREER_PLANNER_PROMPT_VERSION,
      inputHash,
      timelineWeeks: preferredTimelineWeeks,
      result: validatedResult,
    });

    await dependencies.aiRequestRepository.markSucceeded(audit.id, {
      provider: llmResult.provider,
      model: llmResult.model,
      latencyMs: llmResult.latencyMs,
      outputSizeChars: llmResult.text.length,
      attemptCount: (llmResult.attempts?.length || 0) + 1,
      metadata: { attempts: llmResult.attempts || [] },
    });

    return {
      cached: false,
      roadmap: savedRoadmap.result_json,
      roadmapId: savedRoadmap.id,
      aiRequestId: audit.id,
    };
  } catch (error) {
    await dependencies.aiRequestRepository.markFailed(audit.id, {
      errorCategory: error.category || 'unknown',
      errorMessage: error.message,
      attemptCount: error.details?.attempts?.length || 1,
      metadata: { attempts: error.details?.attempts || [] },
    });

    throw new AiServiceError(
      mapProviderErrorStatus(error),
      error instanceof LlmError && error.category === ERROR_CATEGORIES.INVALID_RESPONSE
        ? 'Output AI tidak valid.'
        : 'Provider AI sedang tidak tersedia.',
      { cause: error.message }
    );
  }
};

//Ambil roadmap terbaru milik user.
const getLatestCareerRoadmap = async ({ userId, dependencies = defaultDependencies }) => {
  return dependencies.careerRoadmapRepository.getLatestForUser(userId);
};

//Ambil roadmap berdasarkan id dengan ownership user.
const getCareerRoadmapById = async ({ userId, roadmapId, dependencies = defaultDependencies }) => {
  return dependencies.careerRoadmapRepository.getByIdForUser(roadmapId, userId);
};

module.exports = {
  buildCvReviewSummary,
  createCareerRoadmap,
  getLatestCareerRoadmap,
  getCareerRoadmapById,
};
