# 19MJ Local STT Service

Service Python ini menjalankan transkripsi lokal untuk backend 19MJ. Runtime Python project ini wajib memakai `uv`.

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

## 2. Konfigurasi Env

Untuk AI service, salin `AI/.env.example` ke `AI/.env` atau set env langsung di shell. Untuk local development yang sudah memakai satu file, nilai yang sama boleh tetap ada di `BE/.env`.

```env
AI_STT_MODEL_ID=oxide-lab/whisper-medium-GGUF
AI_SERVICE_TOKEN=
AI_STT_MODEL_FILE=whisper-medium-q8_0.gguf
AI_STT_MODEL_REPO_PATH=whisper.cpp/whisper-medium-q8_0.gguf
AI_STT_MODEL_DIR=models/model_cache
AI_STT_ENGINE=whisper.cpp
AI_STT_COMMAND_PATH=D:/Programming/Capstone/19MJ/AI/tools/whisper.cpp/Release/whisper-cli.exe
AI_STT_TIMEOUT_SECONDS=600
AI_STT_TEMP_DIR=storage/stt_tmp
AI_ALLOWED_AUDIO_ROOT=D:/Programming/Capstone/19MJ/BE/storage/interviews
```

`AI_ALLOWED_AUDIO_ROOT` wajib mengarah ke folder media interview backend. Endpoint `/transcribe` akan menolak path audio di luar folder ini.

`AI_SERVICE_TOKEN` opsional untuk local development. Jika diisi, value yang sama harus ada di env BE agar request `BE -> AI` membawa header internal yang valid.

Untuk membandingkan model lain, ubah `AI_STT_MODEL_FILE` dan `AI_STT_MODEL_REPO_PATH`, lalu restart `uvicorn`.

Contoh q4:

```env
AI_STT_MODEL_FILE=whisper-medium-q4_0.gguf
AI_STT_MODEL_REPO_PATH=whisper.cpp/whisper-medium-q4_0.gguf
```

## 3. Download Model STT

Default model project:

```txt
oxide-lab/whisper-medium-GGUF
whisper.cpp/whisper-medium-q8_0.gguf
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

Catatan: untuk repo `oxide-lab/whisper-medium-GGUF`, gunakan file dari subfolder `whisper.cpp/`. File root repo ditujukan untuk Candle dan tidak kompatibel dengan `whisper.cpp`.

## 4. Download `whisper-cli`

Download prebuilt `whisper.cpp` CLI untuk Windows:

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
AI_STT_COMMAND_PATH=D:/Programming/Capstone/19MJ/AI/tools/whisper.cpp/Release/whisper-cli.exe
```

## 5. Run AI Service

```bash
cd /d/Programming/Capstone/19MJ/AI
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

Stop service dengan `CTRL+C`.

## 6. Health Check

```bash
curl http://127.0.0.1:8001/health
```

Service siap transkripsi real jika:

```json
{
  "model_exists": true,
  "command_exists": true
}
```

`model_file` di response harus sama dengan `AI_STT_MODEL_FILE` di env aktif.

## 7. Test Transcribe

Contoh memakai file hasil upload backend:

```bash
curl -X POST http://127.0.0.1:8001/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_path":"D:/Programming/Capstone/19MJ/BE/storage/interviews/1/media-test.mp3","language":"id"}'
```

Path di luar `AI_ALLOWED_AUDIO_ROOT` akan ditolak dengan `400 invalid_audio_path`.

Response sukses:

```json
{
  "status": "completed",
  "transcript": "Hasil transcript...",
  "segments": [],
  "latency_ms": 11272,
  "model": {
    "model_file": "whisper-medium-q8_0.gguf",
    "model_exists": true,
    "command_exists": true
  }
}
```

## 8. Test Lewat Backend

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

## 9. Troubleshooting

Jika `/health` masih q8 padahal `.env` sudah q4:

```bash
CTRL+C
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

Jika `model_exists=false`, cek file model:

```bash
find models/model_cache -name "*.gguf"
```

Jika `command_exists=false`, cek binary:

```bash
find tools/whisper.cpp -name "whisper-cli.exe"
```

Jika muncul `bad magic`, model yang dipakai kemungkinan bukan file dari subfolder `whisper.cpp/`. Hapus model lama dan download ulang:

```bash
rm models/model_cache/whisper-medium-q8_0.gguf
./scripts/download-stt-model.sh
```

Jika muncul warning `main.exe is deprecated`, ubah `AI_STT_COMMAND_PATH` ke `whisper-cli.exe`.
