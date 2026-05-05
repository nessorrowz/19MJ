//Controller health check untuk route AI.
const { AiServiceError, createCvReview, getLatestCvReview, getCvReviewById } = require('../services/cvReviewService');
const {
  createCareerRoadmap,
  getLatestCareerRoadmap,
  getCareerRoadmapById,
} = require('../services/careerPlannerService');
const {
  createInterviewSession,
  getInterviewSession,
  saveInterviewMedia,
  updateInterviewTranscript,
  transcribeInterviewSession,
} = require('../services/interviewSessionService');
const { evaluateInterviewSession } = require('../services/interviewEvaluationService');
const {
  createScreeningAnswer,
  createScreeningQuestion,
  evaluateCandidateScreening,
  getCandidateScreeningEvaluation,
} = require('../services/candidateEvaluationService');
const {
  validateCandidateEvaluationRequest,
  validateCareerRoadmapRequest,
  validateCvReviewRequest,
  validateInterviewSessionRequest,
  validateScreeningAnswerRequest,
  validateScreeningQuestionRequest,
  validateTranscriptUpdateRequest,
} = require('../validators/aiRequestValidators');

const sendError = (res, error) => {
  if (error instanceof AiServiceError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({ message: 'Terjadi kesalahan pada layanan AI.' });
};

//Health route AI umum untuk user terautentikasi.
const getAiHealth = (req, res) => {
  res.json({
    status: 'ok',
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
};

//Health route khusus candidate.
const getCandidateHealth = (req, res) => {
  res.json({ status: 'ok', scope: 'candidate' });
};

//Health route khusus company.
const getCompanyHealth = (req, res) => {
  res.json({ status: 'ok', scope: 'company' });
};

//Endpoint untuk membuat review CV berbasis teks.
const requestCvReview = async (req, res) => {
  const { error, value } = validateCvReviewRequest(req.body);

  if (error) {
    return res.status(400).json(error);
  }

  try {
    const result = await createCvReview({
      userId: req.user.id,
      cvText: value.cvText,
      targetRole: value.targetRole,
    });

    return res.status(result.cached ? 200 : 201).json({
      message: result.cached ? 'Review CV diambil dari cache.' : 'Review CV berhasil dibuat.',
      cached: result.cached,
      reviewId: result.reviewId || null,
      aiRequestId: result.aiRequestId,
      result: result.review,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk mengambil review CV terbaru.
const getLatestCvReviewResult = async (req, res) => {
  try {
    const review = await getLatestCvReview({ userId: req.user.id });

    if (!review) {
      return res.status(404).json({ message: 'Review CV belum tersedia.' });
    }

    return res.json({ result: review });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk mengambil review CV berdasarkan id.
const getCvReviewResultById = async (req, res) => {
  const reviewId = Number(req.params.id);

  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ message: 'ID review CV tidak valid.' });
  }

  try {
    const review = await getCvReviewById({ userId: req.user.id, reviewId });

    if (!review) {
      return res.status(404).json({ message: 'Review CV tidak ditemukan.' });
    }

    return res.json({ result: review });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk membuat career roadmap.
const requestCareerRoadmap = async (req, res) => {
  const { error, value } = validateCareerRoadmapRequest(req.body);

  if (error) {
    return res.status(400).json(error);
  }

  try {
    const result = await createCareerRoadmap({
      userId: req.user.id,
      targetRole: value.targetRole,
      currentSkills: value.currentSkills,
      preferredTimelineWeeks: value.preferredTimelineWeeks,
    });

    return res.status(result.cached ? 200 : 201).json({
      message: result.cached ? 'Career roadmap diambil dari cache.' : 'Career roadmap berhasil dibuat.',
      cached: result.cached,
      roadmapId: result.roadmapId || null,
      aiRequestId: result.aiRequestId,
      result: result.roadmap,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk mengambil career roadmap terbaru.
const getLatestCareerRoadmapResult = async (req, res) => {
  try {
    const roadmap = await getLatestCareerRoadmap({ userId: req.user.id });

    if (!roadmap) {
      return res.status(404).json({ message: 'Career roadmap belum tersedia.' });
    }

    return res.json({ result: roadmap });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk mengambil career roadmap berdasarkan id.
const getCareerRoadmapResultById = async (req, res) => {
  const roadmapId = Number(req.params.id);

  if (!Number.isInteger(roadmapId) || roadmapId <= 0) {
    return res.status(400).json({ message: 'ID career roadmap tidak valid.' });
  }

  try {
    const roadmap = await getCareerRoadmapById({ userId: req.user.id, roadmapId });

    if (!roadmap) {
      return res.status(404).json({ message: 'Career roadmap tidak ditemukan.' });
    }

    return res.json({ result: roadmap });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk membuat sesi interview.
const requestInterviewSession = async (req, res) => {
  const { error, value } = validateInterviewSessionRequest(req.body);

  if (error) {
    return res.status(400).json(error);
  }

  try {
    const session = await createInterviewSession({
      userId: req.user.id,
      questionText: value.questionText,
    });

    return res.status(201).json({
      message: 'Sesi interview berhasil dibuat.',
      result: session,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk menyimpan metadata media interview.
const uploadInterviewSessionMedia = async (req, res) => {
  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'ID sesi interview tidak valid.' });
  }

  try {
    const session = await saveInterviewMedia({
      userId: req.user.id,
      sessionId,
      file: req.file,
    });

    return res.json({
      message: 'Media interview berhasil diupload.',
      result: session,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk trigger transkripsi interview.
const transcribeInterviewSessionMedia = async (req, res) => {
  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'ID sesi interview tidak valid.' });
  }

  try {
    const result = await transcribeInterviewSession({
      userId: req.user.id,
      sessionId,
    });

    return res.json({
      message: 'Transkripsi interview berhasil diproses.',
      result,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk mengambil sesi interview.
const getInterviewSessionResult = async (req, res) => {
  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'ID sesi interview tidak valid.' });
  }

  try {
    const session = await getInterviewSession({ userId: req.user.id, sessionId });

    if (!session) {
      return res.status(404).json({ message: 'Sesi interview tidak ditemukan.' });
    }

    return res.json({ result: session });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk update edited transcript interview.
const updateInterviewTranscriptResult = async (req, res) => {
  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'ID sesi interview tidak valid.' });
  }

  const { error, value } = validateTranscriptUpdateRequest(req.body);

  if (error) {
    return res.status(400).json(error);
  }

  try {
    const result = await updateInterviewTranscript({
      userId: req.user.id,
      sessionId,
      editedTranscript: value.editedTranscript,
    });

    return res.json({
      message: 'Transkrip interview berhasil diperbarui.',
      result,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk evaluasi jawaban interview.
const evaluateInterviewSessionResult = async (req, res) => {
  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'ID sesi interview tidak valid.' });
  }

  try {
    const result = await evaluateInterviewSession({
      userId: req.user.id,
      sessionId,
    });

    return res.status(result.cached ? 200 : 201).json({
      message: result.cached ? 'Evaluasi interview diambil dari cache.' : 'Evaluasi interview berhasil dibuat.',
      cached: result.cached,
      evaluationId: result.evaluationId || null,
      aiRequestId: result.aiRequestId,
      result: result.evaluation,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk membuat pertanyaan screening company.
const createScreeningQuestionResult = async (req, res) => {
  const { error, value } = validateScreeningQuestionRequest(req.body);

  if (error) {
    return res.status(400).json(error);
  }

  try {
    const question = await createScreeningQuestion({
      companyUserId: req.user.id,
      jobId: value.jobId || null,
      questionText: value.questionText,
      rubric: value.rubric || {},
    });

    return res.status(201).json({
      message: 'Pertanyaan screening berhasil dibuat.',
      result: question,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk menyimpan jawaban screening kandidat.
const createScreeningAnswerResult = async (req, res) => {
  const { error, value } = validateScreeningAnswerRequest(req.body);

  if (error) {
    return res.status(400).json(error);
  }

  try {
    const answer = await createScreeningAnswer({
      candidateUserId: req.user.id,
      screeningQuestionId: value.screeningQuestionId,
      answerText: value.answerText,
    });

    return res.status(201).json({
      message: 'Jawaban screening berhasil disimpan.',
      result: answer,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk evaluasi jawaban screening kandidat.
const evaluateCandidateScreeningResult = async (req, res) => {
  const { error, value } = validateCandidateEvaluationRequest(req.body);

  if (error) {
    return res.status(400).json(error);
  }

  try {
    const result = await evaluateCandidateScreening({
      companyUserId: req.user.id,
      screeningAnswerId: value.screeningAnswerId,
      jobContext: value.jobContext,
    });

    return res.status(result.cached ? 200 : 201).json({
      message: result.cached ? 'Evaluasi kandidat diambil dari cache.' : 'Evaluasi kandidat berhasil dibuat.',
      cached: result.cached,
      evaluationId: result.evaluationId || null,
      aiRequestId: result.aiRequestId,
      result: result.evaluation,
    });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

//Endpoint untuk mengambil evaluasi kandidat.
const getCandidateScreeningEvaluationResult = async (req, res) => {
  const candidateUserId = Number(req.params.candidateUserId);
  const jobId = req.query.jobId ? Number(req.query.jobId) : null;

  if (!Number.isInteger(candidateUserId) || candidateUserId <= 0) {
    return res.status(400).json({ message: 'ID kandidat tidak valid.' });
  }

  if (jobId !== null && (!Number.isInteger(jobId) || jobId <= 0)) {
    return res.status(400).json({ message: 'ID job tidak valid.' });
  }

  try {
    const evaluation = await getCandidateScreeningEvaluation({
      companyUserId: req.user.id,
      candidateUserId,
      jobId,
    });

    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluasi kandidat tidak ditemukan.' });
    }

    return res.json({ result: evaluation });
  } catch (serviceError) {
    return sendError(res, serviceError);
  }
};

module.exports = {
  getAiHealth,
  getCandidateHealth,
  getCompanyHealth,
  requestCvReview,
  getLatestCvReviewResult,
  getCvReviewResultById,
  requestCareerRoadmap,
  getLatestCareerRoadmapResult,
  getCareerRoadmapResultById,
  requestInterviewSession,
  uploadInterviewSessionMedia,
  transcribeInterviewSessionMedia,
  getInterviewSessionResult,
  updateInterviewTranscriptResult,
  evaluateInterviewSessionResult,
  createScreeningQuestionResult,
  createScreeningAnswerResult,
  evaluateCandidateScreeningResult,
  getCandidateScreeningEvaluationResult,
};
