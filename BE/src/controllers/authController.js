const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

// ─── Helper: Email validation ─────────────────────────────────────────────────
const isValidEmail = (email) =>
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);

// ─── Helper: Sign JWT ─────────────────────────────────────────────────────────
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ============================================================
// US-001: REGISTER CANDIDATE
// POST /api/auth/register/candidate
// ============================================================
const registerCandidate = async (req, res) => {
  const { username, email, password, full_name } = req.body;

  // Validasi wajib
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, dan password wajib diisi.' });
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

    // Cek username sudah dipakai
    const usernameCheck = await client.query(
      'SELECT id FROM candidates WHERE username = $1', [username]
    );
    if (usernameCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Username sudah digunakan.' });
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

module.exports = { registerCandidate, registerCompany, login, getMe };
