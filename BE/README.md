# 19MJ Backend API

Backend Express ini menjadi API publik untuk auth, forgot password, dan semua fitur AI yang dipakai FE. Service Python di folder `AI/` hanya dipanggil internal oleh backend untuk STT/transkripsi.

## 1. Struktur Folder

```text
BE/
  docs/                 Dokumentasi smoke test dan catatan backend.
  scripts/              Script verifikasi backend.
  src/
    ai/                 Modul AI backend.
      controllers/      Handler request/response route AI.
      docs/             Swagger khusus endpoint AI.
      llm/              Adapter Google AI Studio dan OpenRouter.
      middleware/       Upload media interview dan guard terkait.
      prompts/          Prompt versioned untuk setiap fitur AI.
      repositories/     Query PostgreSQL fitur AI.
      routes/           Route `/api/ai`.
      services/         Orkestrasi business flow AI.
      storage/          Helper storage media.
      utils/            Hash, logger, parser, normalizer.
      validators/       Validasi request dan output AI.
    config/             Database, Passport, Resend.
    controllers/        Controller auth dan forgot password.
    middleware/         Auth dan rate limit.
    routes/             Route auth.
    utils/              Helper PIN reset password dan email template.
  storage/              File runtime lokal, tidak perlu masuk Git.
  schema.sql            Skema PostgreSQL.
```

## 2. Setup

Jalankan dari Git Bash:

```bash
cd /d/Programming/Capstone/19MJ/BE
npm install
cp .env.example .env
```

Isi `.env` lokal sesuai kebutuhan. Jangan commit `.env`.

Import schema ke PostgreSQL:

```bash
psql -U postgres -d 19mj_db -f schema.sql
```

Jalankan backend:

```bash
npm run dev
```

Backend default berjalan di:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## 3. Environment Penting

```env
PORT=3000
FE_URL=http://localhost:5173
ENABLE_AI_SWAGGER=true

DB_HOST=localhost
DB_PORT=5432
DB_NAME=19mj_db
DB_USER=postgres
DB_PASSWORD=ISI_PASSWORD_DATABASE

JWT_SECRET=ISI_SECRET_JWT_RANDOM_KUAT
JWT_EXPIRES_IN=1y

GOOGLE_AI_API_KEY=ISI_GOOGLE_AI_API_KEY
GOOGLE_LLM_PRIMARY_MODEL=gemma-4-31b-it
GOOGLE_LLM_SECONDARY_MODEL=gemini-3.1-flash-lite-preview

OPENROUTER_API_KEY=ISI_OPENROUTER_API_KEY
OPENROUTER_FALLBACK_MODEL=tencent/hy3-preview:free
OPENROUTER_SECONDARY_FALLBACK_MODEL=nvidia/nemotron-3-nano-30b-a3b:free

AI_STT_SERVICE_URL=http://localhost:8001
AI_SERVICE_TOKEN=
INTERVIEW_MEDIA_DIR=storage/interviews
```

`AI_SERVICE_TOKEN` boleh kosong untuk local testing. Jika diisi, value yang sama harus ada di `AI/.env` agar request internal `BE -> AI` valid.

## 4. Swagger AI

Swagger untuk testing endpoint AI ada di backend, bukan di folder `AI/`.

```text
http://localhost:3000/api/ai/docs
```

Swagger aktif jika:

```env
ENABLE_AI_SWAGGER=true
```

Di production, Swagger hanya aktif jika `ENABLE_AI_SWAGGER=true`. Untuk mematikan Swagger lokal:

```env
ENABLE_AI_SWAGGER=false
```

### Cara Mendapatkan Token

Semua endpoint AI membutuhkan JWT dari backend auth.

Login candidate:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"candidate@example.com","password":"password123"}'
```

Login company:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"company@example.com","password":"password123"}'
```

Ambil value `token` dari response. Di Swagger, klik `Authorize`, lalu paste JWT tanpa prefix `Bearer ` karena Swagger bearer scheme akan menambahkan prefix itu sendiri.

## 5. Urutan Testing Swagger

### Candidate

1. Login sebagai candidate dan masukkan JWT ke Swagger.
2. Jalankan `GET /api/ai/health`.
3. Jalankan `GET /api/ai/candidate/health`.
4. Test CV Review dengan `POST /api/ai/cv-review`.
5. Test Career Roadmap dengan `POST /api/ai/career-roadmap`.
6. Test Interview dengan urutan di bawah.

Flow interview dengan STT:

```text
POST  /api/ai/interviews
POST  /api/ai/interviews/{id}/media
POST  /api/ai/interviews/{id}/transcribe
GET   /api/ai/interviews/{id}
PATCH /api/ai/interviews/{id}/transcript
POST  /api/ai/interviews/{id}/evaluate
```

Untuk testing tanpa STT, buat session dulu lalu isi transcript manual:

```text
POST  /api/ai/interviews
PATCH /api/ai/interviews/{id}/transcript
POST  /api/ai/interviews/{id}/evaluate
```

### Company

1. Login sebagai company dan masukkan JWT ke Swagger.
2. Jalankan `GET /api/ai/company/health`.
3. Buat pertanyaan dengan `POST /api/ai/screening/questions`.
4. Simpan `id` pertanyaan.
5. Login sebagai candidate, lalu jawab dengan `POST /api/ai/screening/answers`.
6. Simpan `id` jawaban.
7. Login kembali sebagai company, lalu evaluasi dengan `POST /api/ai/screening/evaluate`.
8. Ambil hasil terbaru dengan `GET /api/ai/screening/candidates/{candidateUserId}/evaluation`.

## 6. Endpoint AI

Candidate:

```text
GET    /api/ai/health
GET    /api/ai/candidate/health
POST   /api/ai/cv-review
GET    /api/ai/cv-review/latest
GET    /api/ai/cv-review/:id
POST   /api/ai/career-roadmap
GET    /api/ai/career-roadmap/latest
GET    /api/ai/career-roadmap/:id
POST   /api/ai/interviews
POST   /api/ai/interviews/:id/media
POST   /api/ai/interviews/:id/transcribe
PATCH  /api/ai/interviews/:id/transcript
POST   /api/ai/interviews/:id/evaluate
GET    /api/ai/interviews/:id
POST   /api/ai/screening/answers
```

Company:

```text
GET    /api/ai/company/health
POST   /api/ai/screening/questions
POST   /api/ai/screening/evaluate
GET    /api/ai/screening/candidates/:candidateUserId/evaluation
```

## 7. AI Service Python

Backend memanggil service Python untuk transkripsi lokal.

Jalankan service Python:

```bash
cd /d/Programming/Capstone/19MJ/AI
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

Backend env yang harus mengarah ke service itu:

```env
AI_STT_SERVICE_URL=http://localhost:8001
AI_SERVICE_TOKEN=
```

Jika endpoint interview `/transcribe` gagal, cek:

```bash
curl http://127.0.0.1:8001/health
```

## 8. Logging

Route AI mencatat request HTTP non-production tanpa payload sensitif:

```json
{"event":"ai_http_request","method":"POST","path":"/api/ai/cv-review","statusCode":201,"role":"candidate"}
```

LLM success/failure dicatat sebagai event seperti:

```json
{"event":"ai_request_completed","feature":"career_roadmap","provider":"google","status":"succeeded"}
```

Log tidak boleh berisi token, CV mentah, transcript mentah, prompt penuh, atau payload provider penuh.

## 9. Verification

Syntax check backend:

```bash
npm run check
```

Test hardening AI:

```bash
npm run test:ai
```

Smoke test E2E AI:

```bash
npm run test:e2e:ai
```

`test:e2e:ai` butuh PostgreSQL, backend env valid, AI service untuk flow STT, dan API key LLM jika menjalankan provider real.

## 10. Troubleshooting

Jika Swagger tidak muncul:

```text
Pastikan BE hidup.
Pastikan ENABLE_AI_SWAGGER bukan false.
Buka http://localhost:3000/api/ai/docs.
```

Jika Swagger dapat `401`:

```text
Login ulang lewat /api/auth/login.
Paste token JWT ke Authorize.
Jangan pakai token dari Google login FE sementara flow itu belum menjadi JWT backend.
```

Jika Swagger dapat `403`:

```text
Endpoint candidate dipanggil memakai token company, atau sebaliknya.
Login memakai role yang sesuai.
```

Jika CV atau roadmap lama langsung cepat:

```text
Kemungkinan cache hit untuk input yang sama.
Ubah input jika ingin memaksa request baru.
```

Jika interview transcribe gagal:

```text
Pastikan AI service hidup di 127.0.0.1:8001.
Pastikan model GGUF dan whisper-cli tersedia.
Pastikan AI_ALLOWED_AUDIO_ROOT di AI mengarah ke folder media backend.
```

Jika hanya ingin test evaluasi interview tanpa STT:

```text
Buat session.
PATCH transcript manual.
POST evaluate.
```
