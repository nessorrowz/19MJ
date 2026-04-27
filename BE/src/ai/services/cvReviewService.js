//Service orchestration AI CV Review.
const { createLlmGateway } = require('../llm/llmGateway');
const { ERROR_CATEGORIES, LlmError } = require('../llm/llmErrors');
const aiRequestRepository = require('../repositories/aiRequestRepository');
const candidateDocumentRepository = require('../repositories/candidateDocumentRepository');
const cvReviewRepository = require('../repositories/cvReviewRepository');
const { getCachedResult } = require('./aiCacheService');
const { assertWithinLimit } = require('./aiBudgetService');
const { parseAndValidateAiOutput } = require('./aiOutputService');
const { createAiHash } = require('../utils/aiHash');
const { normalizeText } = require('../utils/textNormalization');
const {
  CV_REVIEW_PROMPT_VERSION,
  CV_REVIEW_RUBRIC_VERSION,
  buildCvReviewPrompt,
} = require('../prompts/cvReviewPrompt');

const FEATURE = 'cv_review';

class AiServiceError extends Error {
  constructor(statusCode, message, details = {}) {
    super(message);
    this.name = 'AiServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const mapProviderErrorStatus = (error) => {
  if (error instanceof LlmError && error.category === ERROR_CATEGORIES.INVALID_RESPONSE) {
    return 422;
  }

  return 503;
};

const defaultDependencies = {
  aiRequestRepository,
  candidateDocumentRepository,
  cvReviewRepository,
  getCachedResult,
  createLlmGateway,
};

//Buat review CV baru atau ambil cache jika input identik.
const createCvReview = async ({
  userId,
  cvText,
  targetRole = null,
  dependencies = defaultDependencies,
}) => {
  if (!userId) {
    throw new AiServiceError(401, 'User belum terautentikasi.');
  }

  const normalizedCvText = normalizeText(cvText);
  assertWithinLimit('cvText', normalizedCvText);

  const normalizedTargetRole = targetRole ? normalizeText(targetRole) : null;
  const inputHash = createAiHash({
    feature: FEATURE,
    promptVersion: CV_REVIEW_PROMPT_VERSION,
    rubricVersion: CV_REVIEW_RUBRIC_VERSION,
    input: {
      cvText: normalizedCvText,
      targetRole: normalizedTargetRole,
    },
  });

  const cached = await dependencies.getCachedResult({
    userId,
    feature: FEATURE,
    inputHash,
    promptVersion: CV_REVIEW_PROMPT_VERSION,
  });

  if (cached) {
    const audit = await dependencies.aiRequestRepository.createPending({
      userId,
      feature: FEATURE,
      promptVersion: CV_REVIEW_PROMPT_VERSION,
      inputHash,
      cacheKey: inputHash,
      inputSizeChars: normalizedCvText.length,
      metadata: { source: 'cache_lookup' },
    });

    await dependencies.aiRequestRepository.markCacheHit(audit.id, {
      outputSizeChars: JSON.stringify(cached.result_json).length,
      metadata: { cachedAiRequestId: cached.ai_request_id },
    });

    return {
      cached: true,
      review: cached.result_json,
      aiRequestId: audit.id,
    };
  }

  const document = await dependencies.candidateDocumentRepository.create({
    userId,
    documentType: 'cv',
    sourceType: 'text',
    contentText: normalizedCvText,
    contentHash: inputHash,
    metadata: { targetRole: normalizedTargetRole },
  });

  const audit = await dependencies.aiRequestRepository.createPending({
    userId,
    feature: FEATURE,
    promptVersion: CV_REVIEW_PROMPT_VERSION,
    inputHash,
    cacheKey: inputHash,
    inputSizeChars: normalizedCvText.length,
    metadata: {
      rubricVersion: CV_REVIEW_RUBRIC_VERSION,
      targetRole: normalizedTargetRole,
    },
  });

  try {
    const gateway = dependencies.createLlmGateway();
    const llmResult = await gateway.generateText({
      prompt: buildCvReviewPrompt({
        cvText: normalizedCvText,
        targetRole: normalizedTargetRole,
      }),
      responseMimeType: 'application/json',
    });
    const validatedResult = await parseAndValidateAiOutput({
      feature: FEATURE,
      rawText: llmResult.text,
      llmGateway: gateway,
      allowRepair: true,
    });
    const savedReview = await dependencies.cvReviewRepository.create({
      userId,
      aiRequestId: audit.id,
      documentId: document.id,
      targetRole: normalizedTargetRole,
      promptVersion: CV_REVIEW_PROMPT_VERSION,
      inputHash,
      overallScore: validatedResult.overallScore,
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
      review: savedReview.result_json,
      reviewId: savedReview.id,
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

//Ambil review CV terbaru milik user.
const getLatestCvReview = async ({ userId, dependencies = defaultDependencies }) => {
  return dependencies.cvReviewRepository.getLatestForUser(userId);
};

//Ambil review CV berdasarkan id dengan ownership user.
const getCvReviewById = async ({ userId, reviewId, dependencies = defaultDependencies }) => {
  return dependencies.cvReviewRepository.getByIdForUser(reviewId, userId);
};

module.exports = {
  AiServiceError,
  createCvReview,
  getLatestCvReview,
  getCvReviewById,
};
