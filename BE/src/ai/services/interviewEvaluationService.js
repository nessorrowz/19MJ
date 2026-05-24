//Service orchestration evaluasi interview AI.
const { createLlmGateway } = require('../llm/llmGateway');
const { ERROR_CATEGORIES, LlmError } = require('../llm/llmErrors');
const aiRequestRepository = require('../repositories/aiRequestRepository');
const interviewRepository = require('../repositories/interviewRepository');
const { assertWithinLimit, getMaxOutputTokens } = require('./aiBudgetService');
const { getCachedResult } = require('./aiCacheService');
const { parseAndValidateAiOutput } = require('./aiOutputService');
const { AiServiceError } = require('./cvReviewService');
const { createAiHash } = require('../utils/aiHash');
const { logAiEvent } = require('../utils/aiLogger');
const { normalizeText } = require('../utils/textNormalization');
const {
  INTERVIEW_EVALUATION_PROMPT_VERSION,
  INTERVIEW_EVALUATION_RUBRIC_VERSION,
  buildInterviewEvaluationPrompt,
} = require('../prompts/interviewEvaluationPrompt');

const FEATURE = 'interview_evaluation';

const defaultDependencies = {
  aiRequestRepository,
  interviewRepository,
  getCachedResult,
  createLlmGateway,
};

const mapProviderErrorStatus = (error) => {
  if (error instanceof LlmError && error.category === ERROR_CATEGORIES.INVALID_RESPONSE) {
    return 422;
  }

  return 503;
};

//Pilih edited transcript jika tersedia, selain itu gunakan raw transcript.
const selectTranscriptText = (transcript) => normalizeText(
  transcript?.edited_transcript || transcript?.editedTranscript || transcript?.raw_transcript || transcript?.rawTranscript || ''
);

//Evaluasi jawaban interview dari transcript tersimpan.
const evaluateInterviewSession = async ({
  userId,
  sessionId,
  dependencies = defaultDependencies,
}) => {
  const session = await dependencies.interviewRepository.getSessionByIdForUser(sessionId, userId);
  if (!session) {
    throw new AiServiceError(404, 'Sesi interview tidak ditemukan.');
  }

  const transcript = await dependencies.interviewRepository.getTranscriptBySessionId(session.id);
  if (!transcript) {
    throw new AiServiceError(400, 'Transkrip belum tersedia untuk sesi interview ini.');
  }

  const transcriptText = selectTranscriptText(transcript);
  if (!transcriptText) {
    throw new AiServiceError(400, 'Transkrip interview kosong.');
  }

  assertWithinLimit('transcriptText', transcriptText);

  const questionText = normalizeText(session.question_text || session.questionText);
  const inputHash = createAiHash({
    feature: FEATURE,
    promptVersion: INTERVIEW_EVALUATION_PROMPT_VERSION,
    rubricVersion: INTERVIEW_EVALUATION_RUBRIC_VERSION,
    input: {
      questionText,
      transcriptText,
    },
  });

  const cached = await dependencies.getCachedResult({
    userId,
    feature: FEATURE,
    inputHash,
    promptVersion: INTERVIEW_EVALUATION_PROMPT_VERSION,
  });

  if (cached) {
    const audit = await dependencies.aiRequestRepository.createPending({
      userId,
      feature: FEATURE,
      promptVersion: INTERVIEW_EVALUATION_PROMPT_VERSION,
      inputHash,
      cacheKey: inputHash,
      inputSizeChars: transcriptText.length,
      metadata: { source: 'cache_lookup', interviewSessionId: session.id },
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
    userId,
    feature: FEATURE,
    promptVersion: INTERVIEW_EVALUATION_PROMPT_VERSION,
    inputHash,
    cacheKey: inputHash,
    inputSizeChars: transcriptText.length,
    metadata: {
      rubricVersion: INTERVIEW_EVALUATION_RUBRIC_VERSION,
      interviewSessionId: session.id,
    },
  });

  await dependencies.interviewRepository.updateSessionStatus(session.id, userId, {
    status: 'evaluating',
    errorMessage: null,
  });

  try {
    const gateway = dependencies.createLlmGateway();
    const llmResult = await gateway.generateText({
      prompt: buildInterviewEvaluationPrompt({
        questionText,
        transcriptText,
      }),
      responseMimeType: 'application/json',
      maxOutputTokens: getMaxOutputTokens(FEATURE),
    });
    const validatedResult = await parseAndValidateAiOutput({
      feature: FEATURE,
      rawText: llmResult.text,
      llmGateway: gateway,
      allowRepair: true,
      repairMaxOutputTokens: getMaxOutputTokens(FEATURE),
    });
    const savedEvaluation = await dependencies.interviewRepository.createEvaluation({
      interviewSessionId: session.id,
      userId,
      aiRequestId: audit.id,
      promptVersion: INTERVIEW_EVALUATION_PROMPT_VERSION,
      inputHash,
      overallScore: validatedResult.overallScore,
      communicationScore: validatedResult.communicationScore,
      relevanceScore: validatedResult.relevanceScore,
      structureScore: validatedResult.structureScore,
      result: validatedResult,
    });

    await dependencies.aiRequestRepository.markSucceeded(audit.id, {
      provider: llmResult.provider,
      model: llmResult.model,
      latencyMs: llmResult.latencyMs,
      outputSizeChars: llmResult.text.length,
      attemptCount: (llmResult.attempts?.length || 0) + 1,
      metadata: { attempts: llmResult.attempts || [], providerMetadata: llmResult.metadata || null },
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
    await dependencies.interviewRepository.updateSessionStatus(session.id, userId, {
      status: 'completed',
      errorMessage: null,
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
    await dependencies.interviewRepository.updateSessionStatus(session.id, userId, {
      status: 'transcribed',
      errorMessage: error.message,
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

module.exports = {
  evaluateInterviewSession,
  selectTranscriptText,
};
