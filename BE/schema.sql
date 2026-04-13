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
