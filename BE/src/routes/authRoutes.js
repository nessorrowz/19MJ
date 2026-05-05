const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const { forgotPasswordRequestLimiter } = require('../middleware/rateLimitForgotPassword');

// ── US-001: Register Candidate ────────────────────────────
const {
  registerCandidate,
  registerCompany,
  login,
  getMe,
  requestPasswordReset,
  verifyPasswordResetPin,
  resetPasswordWithPin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Email/password routes
router.post('/register/candidate', registerCandidate);
router.post('/register/company',   registerCompany);
router.post('/login',              login);
router.get('/me', protect,         getMe);
router.post('/forgot-password/request', forgotPasswordRequestLimiter, requestPasswordReset);
router.post('/forgot-password/verify-pin', verifyPasswordResetPin);
router.post('/forgot-password/reset', resetPasswordWithPin);

// ── Google OAuth ──────────────────────────────────────────
// Step 1: Redirect ke Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Callback dari Google → redirect ke FE dengan token
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FE_URL || 'http://localhost:5173'}/login?error=google_failed` }),
  (req, res) => {
    const { token, user } = req.user;
    const feUrl = process.env.FE_URL || 'http://localhost:5173';
    // Redirect ke FE dengan token di query param (FE akan simpan ke localStorage)
    const redirectPath = user.role === 'company' ? '/company/dashboard' : '/dashboard';
    res.redirect(`${feUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}&redirect=${redirectPath}`);
  }
);

module.exports = router;
