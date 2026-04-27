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
} = require('../controllers/aiController');

const router = express.Router();

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

module.exports = router;
