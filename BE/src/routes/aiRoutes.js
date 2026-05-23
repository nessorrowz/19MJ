const express = require('express');
const router = express.Router();
const { cvReview, careerAdvice } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Semua route AI butuh login
router.use(protect);

// POST /api/ai/cv-review
router.post('/cv-review', cvReview);

// POST /api/ai/career-advice
router.post('/career-advice', careerAdvice);

module.exports = router;
