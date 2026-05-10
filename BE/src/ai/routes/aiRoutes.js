//Route AI protected dan role-aware.
const express = require('express');
const { protect, requireRole } = require('../../middleware/authMiddleware');
const {
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
} = require('../controllers/aiController');
const { handleInterviewMediaUpload, verifyInterviewSessionOwnership } = require('../middleware/interviewUpload');

const router = express.Router();

//Log status route AI tanpa payload sensitif.
const logAiHttpRequest = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  res.on('finish', () => {
    console.log(JSON.stringify({
      event: 'ai_http_request',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      role: req.user?.role || null,
    }));
  });

  return next();
};

router.use(logAiHttpRequest);
router.use(protect);

router.get('/health', getAiHealth);
router.get('/candidate/health', requireRole('candidate'), getCandidateHealth);
router.get('/company/health', requireRole('company'), getCompanyHealth);
router.post('/cv-review', requireRole('candidate'), requestCvReview);
router.get('/cv-review/latest', requireRole('candidate'), getLatestCvReviewResult);
router.get('/cv-review/:id', requireRole('candidate'), getCvReviewResultById);
router.post('/career-roadmap', requireRole('candidate'), requestCareerRoadmap);
router.get('/career-roadmap/latest', requireRole('candidate'), getLatestCareerRoadmapResult);
router.get('/career-roadmap/:id', requireRole('candidate'), getCareerRoadmapResultById);
router.post('/interviews', requireRole('candidate'), requestInterviewSession);
router.post(
  '/interviews/:id/media',
  requireRole('candidate'),
  verifyInterviewSessionOwnership,
  handleInterviewMediaUpload,
  uploadInterviewSessionMedia
);
router.post('/interviews/:id/transcribe', requireRole('candidate'), transcribeInterviewSessionMedia);
router.patch('/interviews/:id/transcript', requireRole('candidate'), updateInterviewTranscriptResult);
router.post('/interviews/:id/evaluate', requireRole('candidate'), evaluateInterviewSessionResult);
router.get('/interviews/:id', requireRole('candidate'), getInterviewSessionResult);
router.post('/screening/questions', requireRole('company'), createScreeningQuestionResult);
router.post('/screening/answers', requireRole('candidate'), createScreeningAnswerResult);
router.post('/screening/evaluate', requireRole('company'), evaluateCandidateScreeningResult);
router.get('/screening/candidates/:candidateUserId/evaluation', requireRole('company'), getCandidateScreeningEvaluationResult);

module.exports = router;
