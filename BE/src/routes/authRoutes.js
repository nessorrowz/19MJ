const express  = require('express');
const router   = express.Router();
const { registerCandidate, registerCompany, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ── US-001: Register Candidate ────────────────────────────
router.post('/register/candidate', registerCandidate);

// ── US-003: Register Company ──────────────────────────────
router.post('/register/company', registerCompany);

// ── US-002 & US-004: Login (Candidate & Company) ─────────
router.post('/login', login);

// ── Protected ─────────────────────────────────────────────
router.get('/me', protect, getMe);

module.exports = router;
