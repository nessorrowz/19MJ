# 19MJ Local STT Service

Service Python ini menjalankan transkripsi lokal untuk backend 19MJ. Runtime Python project ini wajib memakai `uv`.

Swagger untuk testing endpoint AI publik tidak berada di service Python ini. Swagger ada di backend Express:

```text
http://localhost:3000/api/ai/docs
```

Gunakan Swagger BE untuk test fitur CV review, career roadmap, interview orchestration, dan screening. Service Python ini tetap internal untuk STT dan hanya dipanggil oleh BE lewat `AI_STT_SERVICE_URL`.

Prioritas konfigurasi:

```text
process env -> AI/.env -> BE/.env fallback lokal
```

`BE/.env` masih didukung sebagai fallback local development, tetapi service AI bisa berjalan tanpa membaca file itu jika env sudah diset langsung atau `AI/.env` tersedia.

## 1. Setup Environment

Jalankan dari Git Bash:

```bash
cd /d/Programming/Capstone/19MJ/AI
uv venv
uv pip install -r requirements.txt
```

GPU acceleration di Windows memakai CUDA user-space package dari `requirements.txt`, sehingga tidak perlu restart device setelah install.

## 2. Konfigurasi Env

Untuk AI service, salin `AI/.env.example` ke `AI/.env` atau set env langsung di shell. Untuk local development yang sudah memakai satu file, nilai yang sama boleh tetap ada di `BE/.env`.

```env
AI_SERVICE_TOKEN=
AI_STT_MODEL_ID=large-v3-turbo
AI_STT_MODEL_FILE=large-v3-turbo
AI_STT_MODEL_REPO_PATH=
AI_STT_MODEL_DIR=models/model_cache
AI_STT_ENGINE=faster-whisper
AI_STT_DEVICE=auto
AI_STT_COMPUTE_TYPE=auto
AI_STT_CPU_THREADS=0
AI_STT_NUM_WORKERS=1
AI_STT_MAX_CONCURRENT_REQUESTS=1
AI_STT_BATCH_SIZE=8
AI_STT_BEAM_SIZE=1
AI_STT_VAD_FILTER=true
AI_STT_VAD_MIN_SILENCE_MS=500
AI_STT_DEFAULT_LANGUAGE=auto
AI_STT_CONDITION_ON_PREVIOUS_TEXT=false
AI_STT_PRELOAD_MODEL=true
AI_STT_COMMAND_PATH=tools/whisper.cpp/Release/whisper-cli.exe
AI_STT_TIMEOUT_SECONDS=600
AI_STT_TEMP_DIR=storage/stt_tmp
AI_ALLOWED_AUDIO_ROOT=../BE/storage/interviews
```

`AI_ALLOWED_AUDIO_ROOT` wajib mengarah ke folder media interview backend. Endpoint `/transcribe` akan menolak path audio di luar folder ini.

`AI_SERVICE_TOKEN` opsional untuk local development. Jika diisi, value yang sama harus ada di env BE agar request `BE -> AI` membawa header internal yang valid.

Default STT memakai `faster-whisper` dengan `large-v3-turbo`. Model dimuat sekali per proses FastAPI agar request berikutnya tidak mengulang startup cost.

Untuk BE, pastikan `.env` atau `.env.example` memuat:

```env
AI_STT_SERVICE_URL=http://localhost:8001
AI_SERVICE_TOKEN=
AI_STT_LANGUAGE=auto
```

`AI_STT_LANGUAGE=auto` membuat BE mengirim request bilingual secara default. Nilai valid: `auto`, `id`, atau `en`.

Default optimisasi:

- `AI_STT_DEVICE=auto`: pakai CUDA jika tersedia, fallback CPU.
- `AI_STT_COMPUTE_TYPE=auto`: CUDA memakai FP16, CPU memakai INT8.
- `AI_STT_CPU_THREADS=0`: CPU fallback memakai sampai 16 thread otomatis.
- `AI_STT_BATCH_SIZE=8`: GPU memakai batch 8; CPU memakai standard inference batch 1 agar latency lebih rendah.
- `AI_STT_BEAM_SIZE=1`: decoding cepat dengan akurasi praktis tetap baik untuk `large-v3-turbo`.
- `AI_STT_VAD_FILTER=true`: buang bagian non-speech untuk mengurangi latency dan hallucination.
- `AI_STT_DEFAULT_LANGUAGE=auto`: dukung jawaban Indonesia, Inggris, atau campuran tanpa memaksa satu bahasa.
- `AI_STT_PRELOAD_MODEL=true`: model dipreload saat FastAPI startup agar request production tidak kena cold-start model load.
- Pada Windows, service otomatis menambahkan DLL CUDA dari `.venv` jika package `nvidia-cublas-cu12` dan `nvidia-cudnn-cu12` tersedia.

Engine lama `whisper.cpp` tetap didukung. Untuk kembali ke model lama, set `AI_STT_ENGINE=whisper.cpp`, `AI_STT_MODEL_ID=oxide-lab/whisper-medium-GGUF`, `AI_STT_MODEL_FILE=whisper-medium-q8_0.gguf`, dan `AI_STT_MODEL_REPO_PATH=whisper.cpp/whisper-medium-q8_0.gguf`.

## 3. Download Model STT

Default model project:

```txt
large-v3-turbo
faster-whisper
```

Download model:

```bash
cd /d/Programming/Capstone/19MJ/AI
chmod +x scripts/download-stt-model.sh
./scripts/download-stt-model.sh
```

Jika Hugging Face membutuhkan token:

```bash
export HF_TOKEN="hf_xxxxx"
./scripts/download-stt-model.sh
```

Output model disimpan di:

```txt
AI/models/model_cache/
```

Catatan: untuk `faster-whisper`, script memakai cache CTranslate2 di `AI/models/model_cache/`. Model lama `whisper.cpp` tidak dihapus dan tetap bisa dipakai lewat env.

## 4. Download `whisper-cli` Untuk Engine Lama

Langkah ini hanya perlu jika `AI_STT_ENGINE=whisper.cpp`. Default `faster-whisper` tidak memakai binary ini.

```bash
cd /d/Programming/Capstone/19MJ/AI
chmod +x scripts/download-whisper-cli.sh
./scripts/download-whisper-cli.sh
```

Script akan menaruh binary di:

```txt
AI/tools/whisper.cpp/
```

Pastikan env menunjuk ke `whisper-cli.exe`, bukan `main.exe`:

```env
AI_STT_COMMAND_PATH=tools/whisper.cpp/Release/whisper-cli.exe
```

## 5. Run AI Service

```bash
cd /d/Programming/Capstone/19MJ/AI
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

Startup akan memuat model STT. Request transkripsi pertama setelah service siap memakai model yang sudah resident di proses.

Stop service dengan `CTRL+C`.

## 6. Health Check

```bash
curl http://127.0.0.1:8001/health
```

Service siap transkripsi real jika:

```json
{
  "model_exists": true,
  "dependency_exists": true,
  "command_exists": true
}
```

`engine` harus `faster-whisper` dan `model_id` harus `large-v3-turbo` untuk konfigurasi default baru.

## 7. Test Transcribe

Contoh memakai file hasil upload backend:

```bash
curl -X POST http://127.0.0.1:8001/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_path":"../BE/storage/interviews/1/media-test.mp3","language":"auto"}'
```

`language` menerima `auto`, `id`, atau `en`. Gunakan `auto` untuk jawaban Indonesia, Inggris, atau campuran.

Untuk meningkatkan akurasi tanpa hardcoded correction dictionary, request boleh menyertakan konteks dinamis:

```json
{
  "audio_path": "../BE/storage/interviews/1/media-test.mp3",
  "language": "auto",
  "context_prompt": "Transcribe the interview answer accurately. Preserve Indonesian and English words as spoken. Interview question: Ceritakan pengalaman Anda menangani pelanggan marah.",
  "hotwords": "Transcribe the interview answer accurately. Preserve Indonesian and English words as spoken. Interview question: Ceritakan pengalaman Anda menangani pelanggan marah."
}
```

`context_prompt` dan `hotwords` dipakai sebagai bias decoding oleh `faster-whisper`, bukan sebagai post-processing replace. Nilainya harus berasal dari data sesi seperti pertanyaan interview, role, industri, atau konteks yang dipilih user. Jangan isi dengan kamus statis domain tertentu di service AI.

Path di luar `AI_ALLOWED_AUDIO_ROOT` akan ditolak dengan `400 invalid_audio_path`.

Response sukses:

```json
{
  "status": "completed",
  "transcript": "Hasil transcript...",
  "segments": [],
  "latency_ms": 9600,
  "model": {
    "model_id": "large-v3-turbo",
    "model_file": "large-v3-turbo",
    "engine": "faster-whisper",
    "model_exists": true,
    "dependency_exists": true,
    "command_exists": true
  }
}
```

## 8. Endpoint Internal AI

Endpoint service ini bersifat internal untuk BE. FE tidak boleh memanggil service ini langsung.

```text
GET  /health
POST /transcribe
```

### `GET /health`

Dipakai untuk memastikan model dan command STT siap.

Response penting:

```json
{
  "status": "ok",
  "service": "19MJ Local STT",
  "model": {
    "model_id": "large-v3-turbo",
    "model_file": "large-v3-turbo",
    "engine": "faster-whisper",
    "model_exists": true,
    "dependency_exists": true,
    "command_exists": true
  }
}
```

### `POST /transcribe`

Dipakai BE setelah media interview diupload ke storage backend.

Request:

```json
{
  "audio_path": "../BE/storage/interviews/1/media-test.mp3",
  "language": "auto",
  "context_prompt": "Transcribe the interview answer accurately. Preserve Indonesian and English words as spoken. Interview question: Ceritakan pengalaman Anda membangun API yang aman dan mudah dirawat.",
  "hotwords": "Transcribe the interview answer accurately. Preserve Indonesian and English words as spoken. Interview question: Ceritakan pengalaman Anda membangun API yang aman dan mudah dirawat."
}
```

Field request:

```text
audio_path       wajib, path media di bawah AI_ALLOWED_AUDIO_ROOT.
language         opsional, salah satu auto/id/en. Default auto.
context_prompt   opsional, konteks dinamis dari sesi untuk membantu decoding.
hotwords         opsional, frasa prioritas dari konteks dinamis yang sama.
```

Response:

```json
{
  "status": "completed",
  "transcript": "Hasil transcript...",
  "segments": [],
  "latency_ms": 12000,
  "model": {
    "model_id": "large-v3-turbo",
    "model_file": "large-v3-turbo",
    "engine": "faster-whisper",
    "runtime_device": "cuda",
    "runtime_compute_type": "float16",
    "runtime_batch_size": 8,
    "runtime_inference": "batched",
    "context_prompt_used": true,
    "hotwords_used": true,
    "audio_path": "../BE/storage/interviews/1/media-test.mp3"
  }
}
```

Error publik:

```text
400 audio_file_not_found
400 invalid_audio_path
401 ai_service_unauthorized
503 stt_model_not_found
503 stt_dependency_not_found
503 stt_model_load_failed
503 stt_command_not_found
503 stt_timeout
503 stt_command_failed
```

## 9. Integrasi BE

BE adalah satu-satunya caller yang seharusnya memanggil AI service.

Env BE yang terkait:

```env
AI_STT_SERVICE_URL=http://localhost:8001
AI_SERVICE_TOKEN=
```

Jika `AI_SERVICE_TOKEN` diisi di AI, value yang sama wajib ada di BE. BE akan mengirim token lewat header:

```text
X-19MJ-AI-Token: <AI_SERVICE_TOKEN>
```

Flow transkripsi dari BE:

```text
Candidate login
  -> POST /api/ai/interviews
  -> POST /api/ai/interviews/:id/media
  -> POST /api/ai/interviews/:id/transcribe
  -> BE builds dynamic STT context from session data
  -> BE calls AI POST /transcribe
  -> BE saves raw transcript
  -> PATCH /api/ai/interviews/:id/transcript
  -> POST /api/ai/interviews/:id/evaluate
```

Endpoint BE untuk candidate:

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

Endpoint BE untuk company:

```text
GET    /api/ai/company/health

POST   /api/ai/screening/questions
POST   /api/ai/screening/evaluate
GET    /api/ai/screening/candidates/:candidateUserId/evaluation
```

Semua endpoint BE di atas membutuhkan JWT dari `/api/auth/login`. Role candidate dan company divalidasi di route BE.

Saat membuat sesi interview, BE menerima opsi STT berikut:

```json
{
  "questionText": "Ceritakan pengalaman Anda menangani pelanggan marah."
}
```

`transcriptionLanguage` dan `transcriptionContext` bersifat opsional. Jika `transcriptionLanguage` tidak dikirim, BE memakai `AI_STT_LANGUAGE`, lalu fallback ke `auto`.

Saat transkripsi, BE selalu membangun `context_prompt` minimal dari `questionText`. Jika UI punya konteks domain tambahan seperti role, industri, jenis interview, atau job title, kirim lewat `transcriptionContext`:

```json
{
  "questionText": "Ceritakan pengalaman Anda menangani pelanggan marah.",
  "transcriptionContext": "Customer service interview"
}
```

Pendekatan ini menjaga akurasi untuk berbagai domain tanpa hardcoded tech dictionary. FE atau Swagger tidak wajib mengirim `transcriptionLanguage: "auto"` karena default sudah `auto`.

## 10. Integrasi FE

FE hanya berkomunikasi dengan BE Express, bukan dengan AI FastAPI.

Aturan integrasi FE:

- Jangan simpan `AI_STT_SERVICE_URL`, `AI_SERVICE_TOKEN`, path model, atau path storage di FE.
- Upload media interview ke `POST /api/ai/interviews/:id/media` dengan `multipart/form-data` field `media`.
- Saat membuat sesi, `transcriptionLanguage` tidak wajib dikirim karena default BE adalah `auto`.
- Kirim `transcriptionContext` hanya jika UI punya role, industri, jenis interview, job title, atau konteks domain lain yang memang berasal dari pilihan user/session.
- Trigger transkripsi lewat `POST /api/ai/interviews/:id/transcribe`.
- Ambil hasil sesi lewat `GET /api/ai/interviews/:id`.
- Tampilkan `raw_transcript` sebagai hasil awal dan simpan koreksi user lewat `PATCH /api/ai/interviews/:id/transcript`.
- Jalankan evaluasi interview lewat `POST /api/ai/interviews/:id/evaluate` setelah transcript tersedia.

Contoh flow FE interview:

```text
Create session
  -> Upload file
  -> Trigger transcribe
  -> Poll/refetch session
  -> User edits transcript
  -> Evaluate transcript
  -> Render evaluation result
```

State minimal yang perlu FE simpan:

```text
interviewSessionId
uploadStatus
transcriptionStatus
rawTranscript
editedTranscript
evaluationResult
```

## 11. Catatan Operasional

- Jalankan AI service hanya di `127.0.0.1` untuk local development.
- Jangan expose AI service ke publik tanpa `AI_SERVICE_TOKEN` dan network restriction.
- `AI_ALLOWED_AUDIO_ROOT` harus mengarah ke folder upload backend agar `/transcribe` tidak bisa membaca path arbitrary.
- Restart AI service setiap mengubah model, command path, allowed root, atau token.
- Restart BE setiap mengubah `AI_STT_SERVICE_URL` atau `AI_SERVICE_TOKEN`.
- File model, `AI/tools/`, `AI/storage/`, dan file test lokal tidak perlu masuk Git.
- FE harus menganggap semua response AI sebagai data dari BE, bukan dari service Python.

## 12. Test Lewat Backend

Pastikan backend dan AI service hidup.

Backend:

```bash
cd /d/Programming/Capstone/19MJ/BE
npm run dev
```

AI service:

```bash
cd /d/Programming/Capstone/19MJ/AI
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

Flow backend:

```txt
POST /api/ai/interviews
POST /api/ai/interviews/:id/media
POST /api/ai/interviews/:id/transcribe
GET  /api/ai/interviews/:id
PATCH /api/ai/interviews/:id/transcript
```

Semua endpoint backend di atas membutuhkan JWT candidate.

Smoke test E2E backend:

```bash
cd /d/Programming/Capstone/19MJ/BE
npm run test:e2e:ai
```

Script ini membuat akun test candidate dan company, menjalankan flow AI utama, lalu menghapus akun test.

## 13. Troubleshooting

Jika `/health` masih menampilkan engine lama padahal `.env` sudah diubah:

```bash
CTRL+C
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

Jika `dependency_exists=false`, install dependency:

```bash
uv pip install -r requirements.txt
```

Jika model belum ada di cache atau first request terlalu lama:

```bash
./scripts/download-stt-model.sh
```

Jika CPU terlalu lambat, pastikan CUDA runtime tersedia agar `runtime_device` bisa `cuda`. Untuk akurasi lebih tinggi dengan latency lebih besar, naikkan `AI_STT_BEAM_SIZE` ke `3` atau `5`.

Jika memakai engine lama dan `command_exists=false`, cek binary:

```bash
find tools/whisper.cpp -name "whisper-cli.exe"
```

Jika muncul warning `main.exe is deprecated`, ubah `AI_STT_COMMAND_PATH` ke `whisper-cli.exe`.
