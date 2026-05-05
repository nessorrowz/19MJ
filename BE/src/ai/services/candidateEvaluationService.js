//Service orchestration evaluasi kandidat screening.
const { createLlmGateway } = require('../llm/llmGateway');
const { ERROR_CATEGORIES, LlmError } = require('../llm/llmErrors');
const aiRequestRepository = require('../repositories/aiRequestRepository');
const screeningRepository = require('../repositories/screeningRepository');
const { assertWithinLimit } = require('./aiBudgetService');
const { getCachedResult } = require('./aiCacheService');
const { parseAndValidateAiOutput } = require('./aiOutputService');
const { AiServiceError } = require('./cvReviewService');
const { createAiHash } = require('../utils/aiHash');
const { logAiEvent } = require('../utils/aiLogger');
const { normalizeText } = require('../utils/textNormalization');
const {
  CANDIDATE_EVALUATION_PROMPT_VERSION,
  CANDIDATE_EVALUATION_RUBRIC_VERSION,
  buildCandidateEvaluationPrompt,
} = require('../prompts/candidateEvaluationPrompt');

const FEATURE = 'candidate_evaluation';

const defaultDependencies = {
  aiRequestRepository,
  screeningRepository,
  getCachedResult,
  createLlmGateway,
};

const mapProviderErrorStatus = (error) => {
  if (error instanceof LlmError && error.category === ERROR_CATEGORIES.INVALID_RESPONSE) {
    return 422;
  }

  return 503;
};

//Buat pertanyaan screening milik company.
const createScreeningQuestion = async ({
  companyUserId,
  jobId = null,
  questionText,
  rubric = {},
  dependencies = defaultDependencies,
}) => dependencies.screeningRepository.createQuestion({
  companyUserId,
  jobId,
  questionText: normalizeText(questionText),
  rubric,
});

//Buat jawaban screening kandidat.
const createScreeningAnswer = async ({
  candidateUserId,
  screeningQuestionId,
  answerText,
  dependencies = defaultDependencies,
}) => dependencies.screeningRepository.createAnswer({
  screeningQuestionId,
  candidateUserId,
  answerText: normalizeText(answerText),
});

//Evaluasi jawaban kandidat untuk pertanyaan screening company.
const evaluateCandidateScreening = async ({
  companyUserId,
  screeningAnswerId,
  jobContext = null,
  dependencies = defaultDependencies,
}) => {
  const answer = await dependencies.screeningRepository.getAnswerForCompany({
    companyUserId,
    screeningAnswerId,
  });

  if (!answer) {
    throw new AiServiceError(404, 'Jawaban screening tidak ditemukan.');
  }

  const normalizedJobContext = normalizeText(jobContext || `Job ID: ${answer.job_id || 'tidak tersedia'}`);
  const questionText = normalizeText(answer.question_text);
  const answerText = normalizeText(answer.answer_text);
  const rubric = answer.rubric_json || {};
  const contextText = normalizeText([
    normalizedJobContext,
    questionText,
    answerText,
    JSON.stringify(rubric),
  ].join('\n'));

  assertWithinLimit('jobContext', contextText);

  const inputHash = createAiHash({
    feature: FEATURE,
    promptVersion: CANDIDATE_EVALUATION_PROMPT_VERSION,
    rubricVersion: CANDIDATE_EVALUATION_RUBRIC_VERSION,
    input: {
      jobContext: normalizedJobContext,
      questionText,
      answerText,
      rubric,
    },
  });

  const cached = await dependencies.getCachedResult({
    userId: companyUserId,
    feature: FEATURE,
    inputHash,
    promptVersion: CANDIDATE_EVALUATION_PROMPT_VERSION,
  });

  if (cached) {
    const audit = await dependencies.aiRequestRepository.createPending({
      userId: companyUserId,
      feature: FEATURE,
      promptVersion: CANDIDATE_EVALUATION_PROMPT_VERSION,
      inputHash,
      cacheKey: inputHash,
      inputSizeChars: contextText.length,
      metadata: { source: 'cache_lookup', screeningAnswerId },
    });

    await dependencies.aiRequestRepository.markCacheHit(audit.id, {
      outputSizeChars: JSON.stringify(cached.result_json).length,
      metadata: { cachedAiRequestId: cached.ai_request_id },
    });
    logAiEvent('ai_request_completed', {
      feature: FEATURE,
      status: 'cache_hit',
      cacheHit: true,
      attemptCount: 0,
    });

    return {
      cached: true,
      evaluation: cached.result_json,
      aiRequestId: audit.id,
    };
  }

  const audit = await dependencies.aiRequestRepository.createPending({
    userId: companyUserId,
    feature: FEATURE,
    promptVersion: CANDIDATE_EVALUATION_PROMPT_VERSION,
    inputHash,
    cacheKey: inputHash,
    inputSizeChars: contextText.length,
    metadata: {
      rubricVersion: CANDIDATE_EVALUATION_RUBRIC_VERSION,
      screeningAnswerId,
      candidateUserId: answer.candidate_user_id,
      jobId: answer.job_id,
    },
  });

  try {
    const gateway = dependencies.createLlmGateway();
    const llmResult = await gateway.generateText({
      prompt: buildCandidateEvaluationPrompt({
        jobContext: normalizedJobContext,
        questionText,
        answerText,
        rubric,
      }),
      responseMimeType: 'application/json',
    });
    const validatedResult = await parseAndValidateAiOutput({
      feature: FEATURE,
      rawText: llmResult.text,
      llmGateway: gateway,
      allowRepair: true,
    });
    const savedEvaluation = await dependencies.screeningRepository.createCandidateEvaluation({
      companyUserId,
      candidateUserId: answer.candidate_user_id,
      aiRequestId: audit.id,
      jobId: answer.job_id,
      promptVersion: CANDIDATE_EVALUATION_PROMPT_VERSION,
      inputHash,
      fitScore: validatedResult.fitScore,
      recommendation: validatedResult.recommendation,
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
    logAiEvent('ai_request_completed', {
      feature: FEATURE,
      provider: llmResult.provider,
      model: llmResult.model,
      latencyMs: llmResult.latencyMs,
      status: 'succeeded',
      cacheHit: false,
      attemptCount: (llmResult.attempts?.length || 0) + 1,
    });

    return {
      cached: false,
      evaluation: savedEvaluation.result_json,
      evaluationId: savedEvaluation.id,
      aiRequestId: audit.id,
    };
  } catch (error) {
    await dependencies.aiRequestRepository.markFailed(audit.id, {
      errorCategory: error.category || 'unknown',
      errorMessage: error.message,
      attemptCount: error.details?.attempts?.length || 1,
      metadata: { attempts: error.details?.attempts || [] },
    });
    logAiEvent('ai_request_failed', {
      feature: FEATURE,
      status: 'failed',
      errorCategory: error.category || 'unknown',
      attemptCount: error.details?.attempts?.length || 1,
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

//Ambil evaluasi kandidat terbaru dengan ownership company.
const getCandidateScreeningEvaluation = async ({
  companyUserId,
  candidateUserId,
  jobId = null,
  dependencies = defaultDependencies,
}) => dependencies.screeningRepository.getCandidateEvaluation({
  companyUserId,
  candidateUserId,
  jobId,
});

module.exports = {
  createScreeningAnswer,
  createScreeningQuestion,
  evaluateCandidateScreening,
  getCandidateScreeningEvaluation,
};
