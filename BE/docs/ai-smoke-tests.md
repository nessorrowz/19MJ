# AI Smoke Tests

Dokumen ini berisi smoke test manual untuk demo lokal. Jangan commit token atau payload sensitif.

## Prasyarat

```bash
cd BE
npm run check
npm run test:ai
```

Jalankan backend:

```bash
cd BE
npm run dev
```

Jalankan AI STT service:

```bash
cd AI
uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

## AI Service

```bash
curl http://127.0.0.1:8001/health
```

Expected:

```json
{
  "model_exists": true,
  "command_exists": true
}
```

Test transkripsi:

```bash
curl -X POST http://127.0.0.1:8001/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_path":"D:/Programming/Capstone/19MJ/AI/tes/tes-mp3.mp3","language":"id"}'
```

Expected:

```json
{
  "status": "completed",
  "latency_ms": 1000
}
```

## Backend AI Endpoints

Semua endpoint backend membutuhkan JWT. Login sebagai candidate atau company, lalu pakai:

```bash
TOKEN="paste-token"
```

CV Review:

```bash
curl -X POST http://localhost:3000/api/ai/cv-review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cvText":"Backend developer dengan pengalaman Express, PostgreSQL, REST API, authentication, deployment, dan project portfolio.","targetRole":"Backend Developer"}'
```

Career Roadmap:

```bash
curl -X POST http://localhost:3000/api/ai/career-roadmap \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetRole":"Backend Developer","currentSkills":["JavaScript","Express","PostgreSQL"],"preferredTimelineWeeks":12}'
```

Interview flow:

```bash
curl -X POST http://localhost:3000/api/ai/interviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionText":"Ceritakan pengalaman backend paling menantang yang pernah Anda kerjakan."}'
```

Upload media:

```bash
curl -X POST http://localhost:3000/api/ai/interviews/1/media \
  -H "Authorization: Bearer $TOKEN" \
  -F "media=@D:/Programming/Capstone/19MJ/AI/tes/tes-mp3.mp3"
```

Transcribe:

```bash
curl -X POST http://localhost:3000/api/ai/interviews/1/transcribe \
  -H "Authorization: Bearer $TOKEN"
```

Evaluate:

```bash
curl -X POST http://localhost:3000/api/ai/interviews/1/evaluate \
  -H "Authorization: Bearer $TOKEN"
```

Main failure cases:

- Missing token returns `401`.
- Wrong role returns `403`.
- Oversized text returns `400`.
- AI provider unavailable returns `503`.
- Invalid AI JSON after repair returns `422`.
