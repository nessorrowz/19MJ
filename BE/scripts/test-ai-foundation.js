//Test deterministik untuk hardening AI foundation.
const assert = require('assert');
const path = require('path');

const { createLlmGateway } = require('../src/ai/llm/llmGateway');
const { ERROR_CATEGORIES, LlmError, normalizeProviderError } = require('../src/ai/llm/llmErrors');
const { parseStrictJson } = require('../src/ai/utils/jsonParser');
const { validateAiResult } = require('../src/ai/validators/aiResultValidators');
const { assertWithinLimit } = require('../src/ai/services/aiBudgetService');
const { createAiHash } = require('../src/ai/utils/aiHash');
const { buildCvReviewPrompt } = require('../src/ai/prompts/cvReviewPrompt');
const { buildCareerPlannerPrompt } = require('../src/ai/prompts/careerPlannerPrompt');
const { buildInterviewEvaluationPrompt } = require('../src/ai/prompts/interviewEvaluationPrompt');
const { buildCandidateEvaluationPrompt } = require('../src/ai/prompts/candidateEvaluationPrompt');
const { assertPathInside } = require('../src/ai/storage/mediaStorage');
const { logAiEvent } = require('../src/ai/utils/aiLogger');
const { verifyInterviewSessionOwnership } = require('../src/ai/middleware/interviewUpload');
const { FEATURE_CACHE_SOURCES } = require('../src/ai/services/aiCacheService');
const {
  buildSttContext,
  getSttRequestHeaders,
  normalizeSttPayload,
  transcribeInterviewSession,
} = require('../src/ai/services/interviewSessionService');

const validCvReview = {
  overallScore: 80,
  summary: 'CV cukup kuat.',
  strengths: ['Pengalaman backend jelas'],
  weaknesses: ['Belum ada metrik'],
  improvementSuggestions: ['Tambahkan dampak terukur'],
  keywordGaps: ['Docker'],
  recommendedRoles: ['Backend Developer'],
};

const validRoadmap = {
  targetRole: 'Backend Developer',
  readinessScore: 70,
  summary: 'Roadmap realistis.',
  skillGaps: ['Testing'],
  phases: [{
    title: 'Foundation',
    durationWeeks: 4,
    focus: 'Backend basics',
    tasks: ['Bangun API'],
    deliverables: ['Repo API'],
  }],
};

const validInterviewEvaluation = {
  overallScore: 82,
  communicationScore: 80,
  relevanceScore: 84,
  structureScore: 78,
  summary: 'Jawaban relevan.',
  strengths: ['Jelas'],
  improvements: ['Tambahkan contoh'],
  suggestedAnswer: 'Gunakan struktur STAR.',
};

const validCandidateEvaluation = {
  fitScore: 76,
  recommendation: 'advance',
  summary: 'Cukup cocok.',
  strengths: ['Relevan'],
  risks: ['Belum detail'],
  interviewFocusAreas: ['Scaling API'],
};

const testLlmFallback = async () => {
  const attempts = [];
  const gateway = createLlmGateway({
    providerFactories: {
      google: () => ({
        async generateText() {
          attempts.push('google');
          throw new LlmError(ERROR_CATEGORIES.TIMEOUT, 'timeout');
        },
      }),
      openrouter: () => ({
        async generateText({ model }) {
          attempts.push(`openrouter:${model}`);
          return { text: '{"ok":true}', provider: 'openrouter', model, latencyMs: 1 };
        },
      }),
    },
  });

  const result = await gateway.generateText({ prompt: 'test' });
  assert.strictEqual(result.provider, 'openrouter');
  assert.strictEqual(attempts.length, 3);
};

const testJsonValidation = () => {
  assert.deepStrictEqual(parseStrictJson('{"ok":true}'), { ok: true });
  assert.throws(() => parseStrictJson('```json\n{"ok":true}\n```'));
  assert.strictEqual(validateAiResult('cv_review', validCvReview).overallScore, 80);
  assert.throws(() => validateAiResult('cv_review', { overallScore: 200 }));
};

const testPromptCompatibility = () => {
  assert.doesNotThrow(() => validateAiResult('cv_review', validCvReview));
  assert.doesNotThrow(() => validateAiResult('career_roadmap', validRoadmap));
  assert.doesNotThrow(() => validateAiResult('interview_evaluation', validInterviewEvaluation));
  assert.doesNotThrow(() => validateAiResult('candidate_evaluation', validCandidateEvaluation));
  assert(buildCvReviewPrompt({ cvText: 'x'.repeat(60), targetRole: 'Backend' }).includes('Return JSON valid saja'));
  assert(buildCareerPlannerPrompt({ targetRole: 'Backend', currentSkills: ['JS'] }).includes('"phases"'));
  assert(buildInterviewEvaluationPrompt({ questionText: 'Q', transcriptText: 'A' }).includes('"overallScore"'));
  assert(buildCandidateEvaluationPrompt({ jobContext: 'J', questionText: 'Q', answerText: 'A', rubric: {} }).includes('"fitScore"'));
};

const testBudgetAndCacheHash = () => {
  process.env.MAX_CV_TEXT_LENGTH = '5';
  assert.throws(() => assertWithinLimit('cvText', '123456'));
  delete process.env.MAX_CV_TEXT_LENGTH;

  const firstHash = createAiHash({ feature: 'cv_review', promptVersion: 'v1', input: ' same text ' });
  const secondHash = createAiHash({ feature: 'cv_review', promptVersion: 'v1', input: 'same text' });
  const thirdHash = createAiHash({ feature: 'cv_review', promptVersion: 'v2', input: 'same text' });
  assert.strictEqual(firstHash, secondHash);
  assert.notStrictEqual(firstHash, thirdHash);
};

const testCacheIsolationSources = () => {
  assert.strictEqual(FEATURE_CACHE_SOURCES.cv_review.ownerColumn, 'user_id');
  assert.strictEqual(FEATURE_CACHE_SOURCES.career_roadmap.ownerColumn, 'user_id');
  assert.strictEqual(FEATURE_CACHE_SOURCES.interview_evaluation.ownerColumn, 'user_id');
  assert.strictEqual(FEATURE_CACHE_SOURCES.candidate_evaluation.ownerColumn, 'company_user_id');
};

const testMediaPathSafety = () => {
  const parent = path.resolve('storage');
  assert.doesNotThrow(() => assertPathInside(parent, path.resolve('storage/interviews/1/file.mp4')));
  assert.throws(() => assertPathInside(parent, path.resolve('../outside/file.mp4')));
};

const testProviderErrorMapping = () => {
  assert.strictEqual(normalizeProviderError({ status: 429, message: 'rate' }).category, ERROR_CATEGORIES.RATE_LIMIT);
  assert.strictEqual(normalizeProviderError({ status: 503, message: 'down' }).category, ERROR_CATEGORIES.PROVIDER_5XX);
  assert.strictEqual(normalizeProviderError({ status: 401, message: 'auth' }).category, ERROR_CATEGORIES.AUTH);
};

const testSafeLogging = () => {
  const originalInfo = console.info;
  let logged = '';
  console.info = (value) => { logged = value; };
  try {
    logAiEvent('ai_request_completed', {
      feature: 'cv_review',
      provider: 'google',
      prompt: 'secret prompt',
      apiKey: 'secret',
      latencyMs: 10,
      status: 'succeeded',
    });
  } finally {
    console.info = originalInfo;
  }

  assert(logged.includes('cv_review'));
  assert(!logged.includes('secret prompt'));
  assert(!logged.includes('apiKey'));
};

const testInterviewUploadOwnershipMiddleware = async () => {
  const req = { params: { id: '10' }, user: { id: 20 } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;

  const originalMethod = require('../src/ai/repositories/interviewRepository').getSessionByIdForUser;
  require('../src/ai/repositories/interviewRepository').getSessionByIdForUser = async () => null;

  try {
    await verifyInterviewSessionOwnership(req, res, () => {
      nextCalled = true;
    });
  } finally {
    require('../src/ai/repositories/interviewRepository').getSessionByIdForUser = originalMethod;
  }

  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 404);
};

const testSttServiceHeaders = () => {
  delete process.env.AI_SERVICE_TOKEN;
  assert.deepStrictEqual(getSttRequestHeaders(), { 'Content-Type': 'application/json' });

  process.env.AI_SERVICE_TOKEN = 'test-token';
  assert.strictEqual(getSttRequestHeaders()['X-19MJ-AI-Token'], 'test-token');
  delete process.env.AI_SERVICE_TOKEN;
};

const testSttPayloadNormalization = () => {
  const result = normalizeSttPayload({
    status: 'completed',
    transcript: 'Jawaban kandidat.',
    segments: [{ start_seconds: 0, end_seconds: 1, text: 'Jawaban kandidat.' }],
    latency_ms: 700,
    model: { engine: 'faster-whisper' },
  });

  assert.strictEqual(result.transcript, 'Jawaban kandidat.');
  assert.strictEqual(result.segments.length, 1);
  assert.strictEqual(result.metadata.latencyMs, 700);
  assert.strictEqual(result.metadata.model.engine, 'faster-whisper');
  assert.throws(() => normalizeSttPayload({ status: 'failed', transcript: 'x' }));
};

const testSttDynamicContext = () => {
  const context = buildSttContext({
    questionText: 'Ceritakan pengalaman Anda menangani pelanggan marah.',
    transcriptionContext: 'Customer service interview',
  });

  assert(context.includes('Preserve Indonesian and English words as spoken.'));
  assert(context.includes('Customer service interview'));
  assert(context.includes('Ceritakan pengalaman Anda menangani pelanggan marah.'));
  assert(!context.includes('PostgreSQL'));
};

const testTranscribeInterviewSessionStoresSuccessfulStt = async () => {
  const calls = [];
  const dependencies = {
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.strictEqual(body.language, 'en');
      assert(body.context_prompt.includes('General interview'));
      assert(body.hotwords.includes('Interview question'));

      return {
        ok: true,
        async json() {
          return {
            status: 'completed',
            transcript: 'Candidate answer.',
            segments: [],
            latency_ms: 650,
            model: { engine: 'faster-whisper' },
          };
        },
      };
    },
    interviewRepository: {
      async getSessionByIdForUser(id, userId) {
        assert.strictEqual(id, 10);
        assert.strictEqual(userId, 20);
        return {
          id: 10,
          user_id: 20,
          media_path: 'storage/interviews/10/audio.mp3',
          question_text: 'Tell me about a difficult customer interaction.',
          metadata_json: {
            transcriptionLanguage: 'en',
            transcriptionContext: 'General interview',
          },
        };
      },
      async updateSessionStatus(id, userId, patch) {
        calls.push({ type: 'status', id, userId, patch });
        return { id, user_id: userId, status: patch.status };
      },
      async saveTranscript(input) {
        calls.push({ type: 'saveTranscript', input });
        return { id: 30, ...input };
      },
    },
  };

  const result = await transcribeInterviewSession({
    userId: 20,
    sessionId: 10,
    dependencies,
  });

  assert.strictEqual(result.transcript.rawTranscript, 'Candidate answer.');
  assert(calls.some((call) => call.type === 'saveTranscript'));
  assert(calls.some((call) => call.type === 'status' && call.patch.status === 'transcribed'));
};

(async () => {
  await testLlmFallback();
  testJsonValidation();
  testPromptCompatibility();
  testBudgetAndCacheHash();
  testCacheIsolationSources();
  testMediaPathSafety();
  testProviderErrorMapping();
  testSafeLogging();
  await testInterviewUploadOwnershipMiddleware();
  testSttServiceHeaders();
  testSttPayloadNormalization();
  testSttDynamicContext();
  await testTranscribeInterviewSessionStoresSuccessfulStt();
  console.log('AI foundation hardening checks passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
