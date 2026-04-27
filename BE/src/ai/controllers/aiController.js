//Controller health check untuk route AI.
const { AiServiceError, createCvReview, getLatestCvReview, getCvReviewById } = require('../services/cvReviewService');
const {
  createCareerRoadmap,
  getLatestCareerRoadmap,
  getCareerRoadmapById,
} = require('../services/careerPlannerService');
const {
  validateCareerRoadmapRequest,
  validateCvReviewRequest,
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
};
