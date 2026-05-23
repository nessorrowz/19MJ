const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { generateResetPin, formatResetPin, hashResetPin, verifyResetPin } = require('../utils/resetPin');
const { sendResendEmail } = require('../config/resend');
const { buildResetPasswordPinEmail } = require('../utils/emailTemplates/resetPasswordPin');
const { buildPasswordResetSuccessEmail } = require('../utils/emailTemplates/passwordResetSuccess');

// ─── Helper: Email validation ─────────────────────────────────────────────────
const isValidEmail = (email) =>
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);

// ─── Helper: Sign JWT ─────────────────────────────────────────────────────────
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const RESET_PIN_EXPIRY_MINUTES = Number(process.env.RESET_PIN_EXPIRY_MINUTES || 5);
const RESET_PIN_MAX_ATTEMPTS = Number(process.env.RESET_PIN_MAX_ATTEMPTS || 3);
const RESET_PIN_RESEND_COOLDOWN_SECONDS = Number(process.env.RESET_PIN_RESEND_COOLDOWN_SECONDS || 60);
const RESET_TOKEN_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN || '15m';
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'fallback_secret';
const RESET_TOKEN_PURPOSE = 'password-reset';
// Balasan publik harus seragam agar status email tidak bisa ditebak dari luar.
const FORGOT_PASSWORD_GENERIC_RESPONSE = {
  message: 'Jika email terdaftar, kami telah mengirimkan kode verifikasi.',
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizePin = (pin) => String(pin || '').replace(/\D/g, '').slice(0, 6);

const signResetToken = (payload) =>
  jwt.sign(
    { ...payload, purpose: RESET_TOKEN_PURPOSE },
    RESET_TOKEN_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRES_IN }
  );

const verifyResetToken = (token) => jwt.verify(token, RESET_TOKEN_SECRET);

const getResetCooldownRemainingSeconds = (lastSentAt) => {
  if (!lastSentAt) {
    return 0;
  }

  const sentAt = new Date(lastSentAt).getTime();
  if (Number.isNaN(sentAt)) {
    return 0;
  }

  const elapsedSeconds = Math.floor((Date.now() - sentAt) / 1000);
  return Math.max(RESET_PIN_RESEND_COOLDOWN_SECONDS - elapsedSeconds, 0);
};

const getUserProfileName = async (client, user) => {
  if (!user) {
    return '';
  }

  if (user.role === 'candidate') {
    const result = await client.query(
      'SELECT username, full_name FROM candidates WHERE user_id = $1',
      [user.id]
    );
    const profile = result.rows[0];
    return profile?.full_name || profile?.username || '';
  }

  if (user.role === 'company') {
    const result = await client.query(
      'SELECT company_name FROM companies WHERE user_id = $1',
      [user.id]
    );
    return result.rows[0]?.company_name || '';
  }

  return '';
};

const getLatestResetRequest = async (client, userId, { lock = false } = {}) => {
  const lockClause = lock ? 'FOR UPDATE' : '';
  const result = await client.query(
    `
      SELECT id, user_id, email_snapshot, pin_hash, expires_at, attempt_count, max_attempts, verified_at, verification_consumed_at, consumed_at, invalidated_at, last_sent_at
      FROM password_reset_requests
      WHERE user_id = $1
        AND consumed_at IS NULL
        AND invalidated_at IS NULL
        AND verification_consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      ${lockClause}
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const invalidateActiveResetRequests = async (client, userId) => {
  await client.query(
    `
      UPDATE password_reset_requests
      SET invalidated_at = NOW()
      WHERE user_id = $1
        AND consumed_at IS NULL
        AND invalidated_at IS NULL
    `,
    [userId]
  );
};

const markRequestConsumed = async (client, requestId) => {
  await client.query(
    `
      UPDATE password_reset_requests
      SET consumed_at = NOW(),
          verified_at = COALESCE(verified_at, NOW())
      WHERE id = $1
    `,
    [requestId]
  );
};

const markRequestVerificationConsumed = async (client, requestId) => {
  await client.query(
    `
      UPDATE password_reset_requests
      SET verified_at = COALESCE(verified_at, NOW()),
          verification_consumed_at = NOW()
      WHERE id = $1
    `,
    [requestId]
  );
};

// ============================================================
// US-001: REGISTER CANDIDATE
// POST /api/auth/register/candidate
// ============================================================
const registerCandidate = async (req, res) => {
  const { email, password, full_name } = req.body;

  // Validasi wajib
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Format email tidak valid. Gunakan email seperti nama@gmail.com.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password minimal 6 karakter.' });
  }

  // Auto-generate username dari email (bagian sebelum @)
  const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cek email sudah terdaftar
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }

    // Generate unique username (tambah angka random jika sudah ada)
    let username = baseUsername;
    let usernameCheck = await client.query('SELECT id FROM candidates WHERE username = $1', [username]);
    let counter = 1;
    while (usernameCheck.rows.length > 0) {
      username = `${baseUsername}${counter++}`;
      usernameCheck = await client.query('SELECT id FROM candidates WHERE username = $1', [username]);
    }

    // Hash password & buat user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, 'candidate')
       RETURNING id, email, role, created_at`,
      [email, hashedPassword]
    );
    const user = userResult.rows[0];

    // Buat candidate profile
    const candidateResult = await client.query(
      `INSERT INTO candidates (user_id, username, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, username, full_name`,
      [user.id, username, full_name || null]
    );
    const candidate = candidateResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Registrasi candidate berhasil!',
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        username:  candidate.username,
        full_name: candidate.full_name,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register candidate error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

// ============================================================
// US-003: REGISTER COMPANY
// POST /api/auth/register/company
// ============================================================
const registerCompany = async (req, res) => {
  const { company_name, email, password, industry, website } = req.body;

  if (!company_name || !email || !password) {
    return res.status(400).json({ message: 'Nama perusahaan, email, dan password wajib diisi.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Format email tidak valid.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password minimal 6 karakter.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cek email sudah terdaftar
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }

    // Hash password & buat user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, 'company')
       RETURNING id, email, role, created_at`,
      [email, hashedPassword]
    );
    const user = userResult.rows[0];

    // Buat company profile
    const companyResult = await client.query(
      `INSERT INTO companies (user_id, company_name, industry, website)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company_name, industry, website`,
      [user.id, company_name, industry || null, website || null]
    );
    const company = companyResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Registrasi perusahaan berhasil!',
      user: {
        id:           user.id,
        email:        user.email,
        role:         user.role,
        company_name: company.company_name,
        industry:     company.industry,
        website:      company.website,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register company error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

// ============================================================
// US-002 & US-004: LOGIN (Candidate & Company — same endpoint)
// POST /api/auth/login
// ============================================================
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Format email tidak valid.' });
  }

  try {
    // Cari user berdasarkan email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const user = result.rows[0];

    // Verifikasi password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    // Ambil profil sesuai role
    let profile = {};
    if (user.role === 'candidate') {
      const cResult = await pool.query(
        'SELECT username, full_name, headline FROM candidates WHERE user_id = $1',
        [user.id]
      );
      profile = cResult.rows[0] || {};
    } else if (user.role === 'company') {
      const cResult = await pool.query(
        'SELECT company_name, industry, website FROM companies WHERE user_id = $1',
        [user.id]
      );
      profile = cResult.rows[0] || {};
    }

    // Buat JWT
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.status(200).json({
      message: 'Login berhasil!',
      token,
      user: {
        id:    user.id,
        email: user.email,
        role:  user.role,
        ...profile,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// ============================================================
// GET /api/auth/me  (protected)
// ============================================================
const getMe = async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const user = userResult.rows[0];
    let profile = {};

    if (user.role === 'candidate') {
      const r = await pool.query(
        'SELECT username, full_name, headline, summary FROM candidates WHERE user_id = $1',
        [user.id]
      );
      profile = r.rows[0] || {};
    } else if (user.role === 'company') {
      const r = await pool.query(
        'SELECT company_name, industry, website, description FROM companies WHERE user_id = $1',
        [user.id]
      );
      profile = r.rows[0] || {};
    }

    res.status(200).json({ user: { ...user, ...profile } });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// ============================================================
// Forgot Password: Request PIN
// POST /api/auth/forgot-password/request
// ============================================================
const requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Format email tidak valid.' });
  }

  const client = await pool.connect();
  let resetRequestId = null;
  let resetEmail = null;
  let resetDisplayName = 'there';
  let resetPin = null;

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      await client.query('COMMIT');
      return res.status(200).json(FORGOT_PASSWORD_GENERIC_RESPONSE);
    }

    const user = userResult.rows[0];
    resetDisplayName = await getUserProfileName(client, user) || user.email.split('@')[0];

    const activeResetRequest = await getLatestResetRequest(client, user.id, { lock: true });

    if (activeResetRequest) {
      const cooldownRemaining = getResetCooldownRemainingSeconds(activeResetRequest.last_sent_at);

      if (cooldownRemaining > 0) {
        await client.query('COMMIT');
        return res.status(200).json(FORGOT_PASSWORD_GENERIC_RESPONSE);
      }
    }

    await invalidateActiveResetRequests(client, user.id);

    resetPin = generateResetPin();
    const pinHash = hashResetPin(resetPin);

    const insertResult = await client.query(
      `
        INSERT INTO password_reset_requests (
          user_id,
          email_snapshot,
          pin_hash,
          expires_at,
          attempt_count,
          max_attempts,
          last_sent_at
        )
        VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval, 0, $5, NOW())
        RETURNING id
      `,
      [user.id, user.email, pinHash, RESET_PIN_EXPIRY_MINUTES, RESET_PIN_MAX_ATTEMPTS]
    );

    resetRequestId = insertResult.rows[0].id;
    resetEmail = user.email;

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback gagal:', rollbackError.message);
    }

    console.error('Request password reset error:', error);
    return res.status(500).json({ message: 'Permintaan reset password gagal diproses. Coba lagi nanti.' });
  } finally {
    client.release();
  }

  try {
    const emailContent = buildResetPasswordPinEmail({
      name: resetDisplayName,
      pinDisplay: formatResetPin(resetPin),
      expiryMinutes: RESET_PIN_EXPIRY_MINUTES,
      maxAttempts: RESET_PIN_MAX_ATTEMPTS,
    });

    await sendResendEmail({
      to: resetEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (mailError) {
    if (resetRequestId) {
      try {
        await pool.query(
          `
            UPDATE password_reset_requests
            SET invalidated_at = NOW()
            WHERE id = $1
              AND consumed_at IS NULL
          `,
          [resetRequestId]
        );
      } catch (invalidateError) {
        console.error('Gagal menandai request reset sebagai tidak valid:', invalidateError.message);
      }
    }

    console.error('Pengiriman email reset gagal:', mailError.message);
    return res.status(200).json(FORGOT_PASSWORD_GENERIC_RESPONSE);
  }

  return res.status(200).json(FORGOT_PASSWORD_GENERIC_RESPONSE);
};

// ============================================================
// Forgot Password: Verifikasi PIN
// POST /api/auth/forgot-password/verify-pin
// ============================================================
const verifyPasswordResetPin = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const pin = normalizePin(req.body.pin);

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Format email tidak valid.' });
  }

  if (pin.length !== 6) {
    return res.status(400).json({ message: 'PIN harus terdiri dari 6 digit.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Kode verifikasi tidak valid atau sudah kedaluwarsa.' });
    }

    const user = userResult.rows[0];
    const resetRequest = await getLatestResetRequest(client, user.id, { lock: true });

    if (!resetRequest) {
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Kode verifikasi tidak valid atau sudah kedaluwarsa.' });
    }

    const now = new Date();
    const expiresAt = new Date(resetRequest.expires_at);

    if (expiresAt <= now) {
      await client.query(
        'UPDATE password_reset_requests SET invalidated_at = NOW() WHERE id = $1',
        [resetRequest.id]
      );
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Kode verifikasi sudah kedaluwarsa.' });
    }

    if (resetRequest.attempt_count >= resetRequest.max_attempts) {
      await client.query(
        'UPDATE password_reset_requests SET invalidated_at = NOW() WHERE id = $1',
        [resetRequest.id]
      );
      await client.query('COMMIT');
      return res.status(429).json({ message: 'Percobaan PIN sudah habis. Ajukan reset password baru.' });
    }

    if (!verifyResetPin(pin, resetRequest.pin_hash)) {
      const nextAttempt = resetRequest.attempt_count + 1;
      const remainingAttempts = Math.max(resetRequest.max_attempts - nextAttempt, 0);

      if (nextAttempt >= resetRequest.max_attempts) {
        await client.query(
          `
            UPDATE password_reset_requests
            SET attempt_count = attempt_count + 1,
                invalidated_at = NOW()
            WHERE id = $1
          `,
          [resetRequest.id]
        );
        await client.query('COMMIT');
        return res.status(429).json({ message: 'PIN salah. Percobaan PIN sudah habis. Ajukan reset password baru.' });
      }

      await client.query(
        'UPDATE password_reset_requests SET attempt_count = attempt_count + 1 WHERE id = $1',
        [resetRequest.id]
      );
      await client.query('COMMIT');
      return res.status(400).json({
        message: `PIN salah. Sisa percobaan: ${remainingAttempts}.`,
      });
    }

    await markRequestVerificationConsumed(client, resetRequest.id);
    await client.query('COMMIT');

    const resetToken = signResetToken({
      requestId: resetRequest.id,
      userId: user.id,
      email: user.email,
    });

    return res.status(200).json({
      message: 'Kode verifikasi valid.',
      resetToken,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback gagal:', rollbackError.message);
    }

    console.error('Verify password reset PIN error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

// ============================================================
// Forgot Password: Reset Password
// POST /api/auth/forgot-password/reset
// ============================================================
const resetPasswordWithPin = async (req, res) => {
  const resetToken = String(req.body.resetToken || '').trim();
  const newPassword = String(req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!resetToken || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Reset token, password baru, dan konfirmasi password wajib diisi.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Password baru dan konfirmasi password tidak sama.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
  }

  let payload;
  try {
    payload = verifyResetToken(resetToken);
  } catch (error) {
    return res.status(400).json({ message: 'Reset token tidak valid atau sudah kedaluwarsa.' });
  }

  if (payload.purpose !== RESET_TOKEN_PURPOSE) {
    return res.status(400).json({ message: 'Reset token tidak valid atau sudah kedaluwarsa.' });
  }

  const client = await pool.connect();
  let successEmail = null;
  let successName = 'there';

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND email = $2',
      [payload.userId, payload.email]
    );

    if (userResult.rows.length === 0) {
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Reset token tidak valid atau sudah kedaluwarsa.' });
    }

    const user = userResult.rows[0];
    const resetRequest = await client.query(
      `
        SELECT id, expires_at, verified_at, verification_consumed_at, consumed_at, invalidated_at
        FROM password_reset_requests
        WHERE id = $1
          AND user_id = $2
        FOR UPDATE
      `,
      [payload.requestId, user.id]
    );

    if (resetRequest.rows.length === 0) {
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Reset token tidak valid atau sudah kedaluwarsa.' });
    }

    const requestRow = resetRequest.rows[0];
    const expired = new Date(requestRow.expires_at) <= new Date();

    if (!requestRow.verified_at || !requestRow.verification_consumed_at || requestRow.consumed_at || requestRow.invalidated_at || expired) {
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Reset token tidak valid atau sudah kedaluwarsa.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    await markRequestConsumed(client, requestRow.id);
    await client.query(
      `
        UPDATE password_reset_requests
        SET invalidated_at = NOW()
        WHERE user_id = $1
          AND id <> $2
          AND consumed_at IS NULL
          AND invalidated_at IS NULL
      `,
      [user.id, requestRow.id]
    );

    successName = await getUserProfileName(client, user) || user.email.split('@')[0];
    successEmail = user.email;

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback gagal:', rollbackError.message);
    }

    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }

  try {
    const emailContent = buildPasswordResetSuccessEmail({ name: successName });
    await sendResendEmail({
      to: successEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (mailError) {
    console.error('Pengiriman notifikasi reset gagal:', mailError.message);
  }

  return res.status(200).json({
    message: 'Password berhasil direset. Silakan login kembali.',
  });
};

// ============================================================
// Google Token Login (from @react-oauth/google popup)
// POST /api/auth/google/token
// Body: { credential: string }
// ============================================================
const googleTokenLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential wajib dikirim.' });
  }

  try {
    // Verify Google ID token via Google API
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!verifyRes.ok) {
      return res.status(401).json({ message: 'Google credential tidak valid.' });
    }

    const googleUser = await verifyRes.json();
    const email = googleUser.email;
    const fullName = googleUser.name || email.split('@')[0];

    if (!email) {
      return res.status(400).json({ message: 'Email tidak ditemukan dari Google.' });
    }

    // Check if user already exists
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      // New user — auto-register as candidate
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const newUser = await client.query(
          `INSERT INTO users (email, password, role)
           VALUES ($1, 'GOOGLE_AUTH', 'candidate')
           RETURNING id, email, role`,
          [email]
        );
        const user = newUser.rows[0];

        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        let username = baseUsername;
        let check = await client.query('SELECT id FROM candidates WHERE username = $1', [username]);
        let counter = 1;
        while (check.rows.length > 0) {
          username = `${baseUsername}${counter++}`;
          check = await client.query('SELECT id FROM candidates WHERE username = $1', [username]);
        }

        await client.query(
          'INSERT INTO candidates (user_id, username, full_name) VALUES ($1, $2, $3)',
          [user.id, username, fullName]
        );

        await client.query('COMMIT');
        userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const user = userResult.rows[0];

    // Get profile based on role
    let profile = {};
    if (user.role === 'candidate') {
      const r = await pool.query(
        'SELECT username, full_name, headline FROM candidates WHERE user_id = $1',
        [user.id]
      );
      profile = r.rows[0] || {};
    } else if (user.role === 'company') {
      const r = await pool.query(
        'SELECT company_name, industry, website FROM companies WHERE user_id = $1',
        [user.id]
      );
      profile = r.rows[0] || {};
    }

    // Create JWT
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      message: 'Login Google berhasil!',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        ...profile,
      },
    });
  } catch (err) {
    console.error('Google token login error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

module.exports = {
  registerCandidate,
  registerCompany,
  login,
  getMe,
  googleTokenLogin,
  requestPasswordReset,
  verifyPasswordResetPin,
  resetPasswordWithPin,
};
