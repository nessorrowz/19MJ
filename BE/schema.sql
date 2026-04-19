-- ============================================================
-- 19MJ Database Schema – Opsi B (Separate Tables per Role)
-- ============================================================
-- Jalankan di PostgreSQL setelah buat database 19mj_db:
--   CREATE DATABASE "19mj_db";
--   \c 19mj_db
-- ============================================================

-- ── Base auth table (shared untuk semua user) ─────────────
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(100) UNIQUE NOT NULL
               CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(20)  NOT NULL
               CHECK (role IN ('candidate', 'company')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Candidate profile (linked ke users) ───────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER UNIQUE NOT NULL
               REFERENCES users(id) ON DELETE CASCADE,
  username   VARCHAR(50)  UNIQUE NOT NULL,
  full_name  VARCHAR(100),
  -- Sprint 2: Candidate Profile (US-005 & US-006)
  headline   VARCHAR(200),
  summary    TEXT,
  phone      VARCHAR(20),
  location   VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Company profile (linked ke users) ─────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER UNIQUE NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(100) NOT NULL,
  -- Sprint 2: Company Profile (US-007)
  industry     VARCHAR(100),
  website      VARCHAR(200),
  description  TEXT,
  location     VARCHAR(100),
  employee_count VARCHAR(50),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- ── Index untuk pencarian cepat ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_username ON candidates(username);
CREATE INDEX IF NOT EXISTS idx_companies_user_id  ON companies(user_id);

-- ── Trigger auto-update updated_at ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- â”€â”€ Permintaan reset password berbasis PIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_snapshot   VARCHAR(100) NOT NULL,
  pin_hash         VARCHAR(255) NOT NULL,
  expires_at       TIMESTAMP NOT NULL,
  attempt_count    INTEGER NOT NULL DEFAULT 0,
  max_attempts     INTEGER NOT NULL DEFAULT 3,
  verified_at      TIMESTAMP NULL,
  verification_consumed_at TIMESTAMP NULL,
  consumed_at      TIMESTAMP NULL,
  invalidated_at   TIMESTAMP NULL,
  last_sent_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id
  ON password_reset_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email_snapshot
  ON password_reset_requests(email_snapshot);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_expires_at
  ON password_reset_requests(expires_at);
