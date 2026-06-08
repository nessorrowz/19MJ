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

-- ── Jobs (linked ke companies/users) ───────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(150),
  type VARCHAR(100),
  experience_level VARCHAR(100),
  salary_range VARCHAR(100),
  description TEXT,
  requirements TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Applications (linked ke jobs dan candidates) ───────────
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  ai_match_score INTEGER,
  ai_analysis TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
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

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
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

-- Penyimpanan audit dan hasil AI untuk fitur kandidat/perusahaan
CREATE TABLE IF NOT EXISTS ai_requests (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature           VARCHAR(50) NOT NULL,
  prompt_version    VARCHAR(80) NOT NULL,
  provider          VARCHAR(50),
  model             VARCHAR(120),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'succeeded', 'failed')),
  cache_key         VARCHAR(128),
  cache_hit         BOOLEAN NOT NULL DEFAULT FALSE,
  input_hash        VARCHAR(128),
  input_size_chars  INTEGER,
  output_size_chars INTEGER,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  latency_ms        INTEGER,
  error_category    VARCHAR(50),
  error_message     TEXT,
  metadata_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS candidate_documents (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type     VARCHAR(40) NOT NULL
                    CHECK (document_type IN ('cv', 'profile', 'transcript', 'other')),
  source_type       VARCHAR(40) NOT NULL DEFAULT 'text'
                    CHECK (source_type IN ('text', 'file', 'transcript')),
  original_filename VARCHAR(255),
  storage_path      TEXT,
  content_text      TEXT,
  content_hash      VARCHAR(128),
  metadata_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_reviews (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_request_id   INTEGER REFERENCES ai_requests(id) ON DELETE SET NULL,
  document_id     INTEGER REFERENCES candidate_documents(id) ON DELETE SET NULL,
  target_role     VARCHAR(120),
  prompt_version  VARCHAR(80) NOT NULL,
  input_hash      VARCHAR(128) NOT NULL,
  overall_score   INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  ats_score       INTEGER CHECK (ats_score BETWEEN 0 AND 100),
  result_json     JSONB NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_roadmaps (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_request_id   INTEGER REFERENCES ai_requests(id) ON DELETE SET NULL,
  target_role     VARCHAR(120) NOT NULL,
  prompt_version  VARCHAR(80) NOT NULL,
  input_hash      VARCHAR(128) NOT NULL,
  timeline_weeks  INTEGER CHECK (timeline_weeks IS NULL OR timeline_weeks > 0),
  result_json     JSONB NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'created'
                  CHECK (status IN ('created', 'media_uploaded', 'transcribing', 'transcribed', 'evaluating', 'completed', 'failed')),
  media_path      TEXT,
  media_mime_type VARCHAR(120),
  media_size_bytes INTEGER CHECK (media_size_bytes IS NULL OR media_size_bytes >= 0),
  error_message   TEXT,
  metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_transcripts (
  id                    SERIAL PRIMARY KEY,
  interview_session_id  INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  raw_transcript        TEXT NOT NULL,
  edited_transcript     TEXT,
  segments_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_evaluations (
  id                    SERIAL PRIMARY KEY,
  interview_session_id  INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_request_id         INTEGER REFERENCES ai_requests(id) ON DELETE SET NULL,
  prompt_version        VARCHAR(80) NOT NULL,
  input_hash            VARCHAR(128) NOT NULL,
  overall_score         INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  communication_score   INTEGER CHECK (communication_score BETWEEN 0 AND 100),
  relevance_score       INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
  structure_score       INTEGER CHECK (structure_score BETWEEN 0 AND 100),
  result_json           JSONB NOT NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screening_questions (
  id            SERIAL PRIMARY KEY,
  company_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        INTEGER,
  question_text TEXT NOT NULL,
  rubric_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screening_answers (
  id                  SERIAL PRIMARY KEY,
  screening_question_id INTEGER NOT NULL REFERENCES screening_questions(id) ON DELETE CASCADE,
  candidate_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text         TEXT NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_evaluations (
  id                  SERIAL PRIMARY KEY,
  company_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_request_id       INTEGER REFERENCES ai_requests(id) ON DELETE SET NULL,
  job_id              INTEGER,
  prompt_version      VARCHAR(80) NOT NULL,
  input_hash          VARCHAR(128) NOT NULL,
  fit_score           INTEGER CHECK (fit_score BETWEEN 0 AND 100),
  recommendation      VARCHAR(40),
  result_json         JSONB NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id
  ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_feature
  ON ai_requests(feature);
CREATE INDEX IF NOT EXISTS idx_ai_requests_cache_lookup
  ON ai_requests(user_id, feature, input_hash, prompt_version, status);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_user_id
  ON candidate_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_reviews_user_id
  ON cv_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_reviews_cache_lookup
  ON cv_reviews(user_id, input_hash, prompt_version, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_career_roadmaps_user_id
  ON career_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_career_roadmaps_cache_lookup
  ON career_roadmaps(user_id, input_hash, prompt_version, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id
  ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_interview_session_id
  ON interview_transcripts(interview_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_transcripts_one_per_session
  ON interview_transcripts(interview_session_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_interview_session_id
  ON interview_evaluations(interview_session_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_cache_lookup
  ON interview_evaluations(user_id, input_hash, prompt_version, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_screening_answers_candidate_user_id
  ON screening_answers(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_evaluations_candidate_user_id
  ON candidate_evaluations(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_evaluations_cache_lookup
  ON candidate_evaluations(company_user_id, input_hash, prompt_version, created_at DESC, id DESC);

CREATE TRIGGER ai_requests_updated_at
  BEFORE UPDATE ON ai_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER candidate_documents_updated_at
  BEFORE UPDATE ON candidate_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER interview_transcripts_updated_at
  BEFORE UPDATE ON interview_transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER screening_questions_updated_at
  BEFORE UPDATE ON screening_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER screening_answers_updated_at
  BEFORE UPDATE ON screening_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
