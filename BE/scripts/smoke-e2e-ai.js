//Smoke test end-to-end untuk BE dan AI STT yang sudah berjalan.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

const beBaseUrl = process.env.E2E_BE_URL || `http://localhost:${process.env.PORT || 3000}`;
const aiBaseUrl = process.env.E2E_AI_URL || process.env.AI_STT_SERVICE_URL || 'http://localhost:8001';
const workspaceRoot = path.resolve(__dirname, '..', '..');
const defaultAudioPath = path.join(workspaceRoot, 'AI', 'tes', 'Fred - BE Engineer.mp3');
const testAudioPath = process.env.E2E_AUDIO_PATH || defaultAudioPath;
const testPassword = process.env.E2E_TEST_PASSWORD || 'Password123!';
const runId = Date.now();
const candidateEmail = `ai.e2e.candidate.${runId}@mail.test`;
const companyEmail = `ai.e2e.company.${runId}@mail.test`;
const requiredTables = [
  'users',
  'candidates',
  'companies',
  'ai_requests',
  'candidate_documents',
  'cv_reviews',
  'career_roadmaps',
  'interview_sessions',
  'interview_evaluations',
  'screening_questions',
  'screening_answers',
  'candidate_evaluations',
];

//Payload kecil agar test cepat tetapi tetap melewati validasi fitur AI.
const cvText = [
  'Saya adalah software engineer dengan pengalaman membangun REST API menggunakan Node.js dan PostgreSQL.',
  'Saya terbiasa membuat autentikasi JWT, validasi input, integrasi layanan eksternal, dan debugging masalah produksi.',
  'Saya juga memiliki pengalaman frontend React, pengelolaan state sederhana, serta komunikasi teknis lintas tim.',
].join(' ');

const assertCondition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

//Log ringkas agar urutan smoke test mudah dilacak.
const logStep = (message) => {
  console.log(`[smoke-e2e-ai] ${message}`);
};

//Request JSON dengan validasi status dan parsing response.
const requestJson = async ({ method = 'GET', url, token, body, expectedStatus = [200] }) => {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  const allowedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  if (!allowedStatuses.includes(response.status)) {
    throw new Error(`${method} ${url} gagal dengan status ${response.status}: ${text}`);
  }

  return payload;
};

//Upload media memakai FormData bawaan Node tanpa dependency tambahan.
const uploadMedia = async ({ url, token, filePath }) => {
  const fileBuffer = await fs.promises.readFile(filePath);
  const formData = new FormData();
  formData.append('media', new Blob([fileBuffer], { type: 'audio/mpeg' }), path.basename(filePath));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (response.status !== 200) {
    throw new Error(`POST ${url} gagal dengan status ${response.status}: ${text}`);
  }

  return payload;
};

//Hapus user test agar data smoke test tidak tertinggal.
const cleanupTestUsers = async () => {
  await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [[candidateEmail, companyEmail]]);
};

//Pastikan schema AI sudah diterapkan sebelum test membuat data.
const runDatabasePreflight = async () => {
  logStep('Cek schema database.');
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [requiredTables]
  );
  const existingTables = new Set(result.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(
      `Schema database belum lengkap. Tabel belum ada: ${missingTables.join(', ')}. Jalankan BE/schema.sql ke database ${process.env.DB_NAME || '19mj_db'} terlebih dahulu.`
    );
  }
};

//Cek service dasar sebelum membuat data test.
const runHealthChecks = async () => {
  logStep('Cek health BE.');
  const beHealth = await requestJson({ url: `${beBaseUrl}/api/health` });
  assertCondition(beHealth.status === 'ok', 'Health BE tidak OK.');

  logStep('Cek health AI STT.');
  const aiHealth = await requestJson({ url: `${aiBaseUrl}/health` });
  assertCondition(aiHealth.status === 'ok', 'Health AI STT tidak OK.');
  assertCondition(aiHealth.model?.model_exists === true, 'Model STT tidak ditemukan oleh AI service.');
  assertCondition(aiHealth.model?.command_exists === true, 'whisper-cli tidak ditemukan oleh AI service.');
};

//Buat user candidate dan company lalu login untuk mengambil token.
const createAndLoginUsers = async () => {
  logStep('Buat akun candidate test.');
  await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/auth/register/candidate`,
    expectedStatus: [201],
    body: {
      email: candidateEmail,
      password: testPassword,
      full_name: `Candidate E2E ${runId}`,
    },
  });

  logStep('Buat akun company test.');
  await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/auth/register/company`,
    expectedStatus: [201],
    body: {
      company_name: `Company E2E ${runId}`,
      email: companyEmail,
      password: testPassword,
      industry: 'Technology',
      website: 'https://example.test',
    },
  });

  logStep('Login candidate dan company.');
  const candidateLogin = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/auth/login`,
    body: {
      email: candidateEmail,
      password: testPassword,
    },
  });
  const companyLogin = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/auth/login`,
    body: {
      email: companyEmail,
      password: testPassword,
    },
  });

  assertCondition(candidateLogin.token, 'Token candidate tidak tersedia.');
  assertCondition(companyLogin.token, 'Token company tidak tersedia.');

  return {
    candidate: candidateLogin,
    company: companyLogin,
  };
};

//Jalankan fitur AI kandidat utama.
const runCandidateAiTests = async ({ candidateToken }) => {
  logStep('Test AI health candidate.');
  await requestJson({ url: `${beBaseUrl}/api/ai/candidate/health`, token: candidateToken });

  logStep('Test CV review.');
  const cvReview = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/cv-review`,
    token: candidateToken,
    expectedStatus: [200, 201],
    body: {
      cvText,
      targetRole: 'Backend Engineer',
    },
  });
  assertCondition(cvReview.result, 'Hasil CV review tidak tersedia.');

  logStep('Test career roadmap.');
  const roadmap = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/career-roadmap`,
    token: candidateToken,
    expectedStatus: [200, 201],
    body: {
      targetRole: 'Backend Engineer',
      currentSkills: ['Node.js', 'PostgreSQL', 'React'],
      preferredTimelineWeeks: 8,
    },
  });
  assertCondition(roadmap.result, 'Hasil career roadmap tidak tersedia.');
};

//Jalankan flow interview dari upload media sampai evaluasi AI.
const runInterviewTests = async ({ candidateToken }) => {
  assertCondition(fs.existsSync(testAudioPath), `File audio test tidak ditemukan: ${testAudioPath}`);

  logStep('Buat sesi interview.');
  const sessionResponse = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/interviews`,
    token: candidateToken,
    expectedStatus: [201],
    body: {
      questionText: 'Ceritakan pengalaman Anda membangun API yang aman dan mudah dirawat.',
    },
  });
  const sessionId = sessionResponse.result?.id;
  assertCondition(sessionId, 'ID sesi interview tidak tersedia.');

  logStep('Upload media interview.');
  await uploadMedia({
    url: `${beBaseUrl}/api/ai/interviews/${sessionId}/media`,
    token: candidateToken,
    filePath: testAudioPath,
  });

  logStep('Transkrip interview via AI STT.');
  const transcriptResponse = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/interviews/${sessionId}/transcribe`,
    token: candidateToken,
  });
  const transcriptPayload = transcriptResponse.result?.transcript;
  const transcript = typeof transcriptPayload === 'string'
    ? transcriptPayload
    : transcriptPayload?.raw_transcript;
  assertCondition(transcript && transcript.length > 0, 'Transkrip interview kosong.');

  logStep('Update edited transcript.');
  await requestJson({
    method: 'PATCH',
    url: `${beBaseUrl}/api/ai/interviews/${sessionId}/transcript`,
    token: candidateToken,
    body: {
      editedTranscript: transcript,
    },
  });

  logStep('Evaluasi interview.');
  const evaluationResponse = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/interviews/${sessionId}/evaluate`,
    token: candidateToken,
    expectedStatus: [200, 201],
  });
  assertCondition(evaluationResponse.result, 'Hasil evaluasi interview tidak tersedia.');
};

//Jalankan flow screening company terhadap kandidat test.
const runScreeningTests = async ({ candidateToken, companyToken, candidateUserId }) => {
  logStep('Test AI health company.');
  await requestJson({ url: `${beBaseUrl}/api/ai/company/health`, token: companyToken });

  logStep('Buat pertanyaan screening.');
  const questionResponse = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/screening/questions`,
    token: companyToken,
    expectedStatus: [201],
    body: {
      jobId: 1,
      questionText: 'Jelaskan cara Anda menangani bug production yang berdampak ke banyak user.',
      rubric: {
        clarity: 'Jawaban jelas dan terstruktur',
        ownership: 'Menunjukkan tanggung jawab teknis',
      },
    },
  });
  const screeningQuestionId = questionResponse.result?.id;
  assertCondition(screeningQuestionId, 'ID pertanyaan screening tidak tersedia.');

  logStep('Simpan jawaban screening kandidat.');
  const answerResponse = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/screening/answers`,
    token: candidateToken,
    expectedStatus: [201],
    body: {
      screeningQuestionId,
      answerText: 'Saya mulai dari mitigasi cepat, cek log dan metrik, komunikasikan dampak, lalu buat root cause analysis setelah service stabil.',
    },
  });
  const screeningAnswerId = answerResponse.result?.id;
  assertCondition(screeningAnswerId, 'ID jawaban screening tidak tersedia.');

  logStep('Evaluasi kandidat screening.');
  const evaluationResponse = await requestJson({
    method: 'POST',
    url: `${beBaseUrl}/api/ai/screening/evaluate`,
    token: companyToken,
    expectedStatus: [200, 201],
    body: {
      screeningAnswerId,
      jobContext: 'Backend Engineer yang menangani API Node.js, PostgreSQL, debugging production, dan kolaborasi lintas tim.',
    },
  });
  assertCondition(evaluationResponse.result, 'Hasil evaluasi screening tidak tersedia.');

  logStep('Ambil evaluasi kandidat screening.');
  const latestEvaluation = await requestJson({
    url: `${beBaseUrl}/api/ai/screening/candidates/${candidateUserId}/evaluation?jobId=1`,
    token: companyToken,
  });
  assertCondition(latestEvaluation.result, 'Evaluasi screening terbaru tidak ditemukan.');
};

//Orkestrasi smoke test dan cleanup data.
const main = async () => {
  let users = null;

  try {
    await runHealthChecks();
    await runDatabasePreflight();
    users = await createAndLoginUsers();

    const candidateToken = users.candidate.token;
    const companyToken = users.company.token;
    const candidateUserId = users.candidate.user?.id;

    assertCondition(candidateUserId, 'ID user candidate tidak tersedia.');

    await runCandidateAiTests({ candidateToken });
    await runInterviewTests({ candidateToken });
    await runScreeningTests({ candidateToken, companyToken, candidateUserId });

    logStep('Semua smoke test E2E AI berhasil.');
  } finally {
    logStep('Cleanup akun test.');
    try {
      await cleanupTestUsers();
    } finally {
      await pool.end();
    }
  }
};

main().catch(async (error) => {
  console.error(`[smoke-e2e-ai] Gagal: ${error.message}`);
  process.exit(1);
});
