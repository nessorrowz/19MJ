# 19MJ Local STT Service

Service ini adalah boundary Python untuk transkripsi lokal sebelum backend Express mengintegrasikan upload media.

## Environment

Gunakan `uv` untuk semua perintah Python di project ini.

```bash
cd AI
uv venv
uv pip install -r requirements.txt
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

## Endpoints

```txt
GET  /health
POST /transcribe
```

Contoh request:

```json
{
  "audio_path": "D:/path/to/audio.wav",
  "language": "id"
}
```

## whisper.cpp Setup

Target engine awal: `whisper.cpp`.

Expected model:

```txt
model id: oxide-lab/whisper-medium-GGUF
model file: whisper-medium-q8_0.gguf
engine: whisper.cpp
```

Variant `q8_0` dipakai sebagai target model lokal project ini.

Cek apakah model sudah tersedia:

```bash
find . -name "whisper-medium-q8_0.gguf"
```

Download model:

```bash
chmod +x scripts/download-stt-model.sh
./scripts/download-stt-model.sh
```

Untuk model publik, token Hugging Face biasanya tidak wajib. Jika repo model private, gated, atau terkena limit, set token sebelum menjalankan script:

```bash
export HF_TOKEN="hf_xxxxx"
./scripts/download-stt-model.sh
```

File model akan disimpan di:

```txt
AI/models/model_cache/whisper-medium-q8_0.gguf
```

Setelah `whisper.cpp` siap, arahkan command lewat env:

```env
AI_STT_COMMAND_PATH=whisper-cli
AI_STT_MODEL_ID=oxide-lab/whisper-medium-GGUF
AI_STT_MODEL_FILE=whisper-medium-q8_0.gguf
AI_STT_MODEL_DIR=models/model_cache
AI_STT_ENGINE=whisper.cpp
```
