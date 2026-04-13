# 19MJ – AI Career Development & Hiring Platform

Platform karir berbasis AI untuk menghubungkan kandidat terbaik dengan perusahaan impian.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL 18 |
| Auth | JWT + bcrypt + Google OAuth |

---

## 🚀 Setup di Laptop Baru

### Prerequisites (install sekali)

1. **Node.js** (v18+) → https://nodejs.org
2. **PostgreSQL 18** → https://www.postgresql.org/download/windows/
   - Saat install, set password untuk user `postgres` (ingat passwordnya!)
   - Centang pgAdmin 4 saat install

---

### Langkah 1 — Clone Repository

```bash
git clone https://github.com/nessorrowz/19MJ.git
cd 19MJ
git checkout dev
```

---

### Langkah 2 — Setup Backend

```bash
cd BE
npm install
```

Buat file `.env` di folder `BE/`:
```env
PORT=3000
FE_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=19mj_db
DB_USER=postgres
DB_PASSWORD=PASSWORD_POSTGRESQL_KAMU

JWT_SECRET=19mjkey
JWT_EXPIRES_IN=1y

GOOGLE_CLIENT_ID=674676669844-4ssen6kts221ruj5qc9vl8m2ob6fohq2.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

> ⚠️ Ganti `DB_PASSWORD` dengan password PostgreSQL yang kamu set saat install.

---

### Langkah 3 — Setup Database

Buka PowerShell dan jalankan (ganti `PASSWORD_KAMU`):

```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
$env:PGPASSWORD = "PASSWORD_KAMU"

# Buat database
echo 'CREATE DATABASE "19mj_db";' | psql -U postgres

# Buat tabel
psql -U postgres -d 19mj_db -f BE\schema.sql
```

Output yang benar:
```
CREATE DATABASE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
```

---

### Langkah 4 — Setup Frontend

```bash
cd FE
npm install
```

Buat file `.env` di folder `FE/`:
```env
VITE_API_URL=http://localhost:3000/api
```

---

### Langkah 5 — Jalankan Aplikasi

Buka **2 terminal terpisah**:

**Terminal 1 — Backend:**
```bash
cd BE
npm run dev
```
Harus muncul: `✅ PostgreSQL terhubung!`

**Terminal 2 — Frontend:**
```bash
cd FE
npm run dev
```
Harus muncul: `➜ Local: http://localhost:5173/`

---

### Langkah 6 — Buka di Browser

| Halaman | URL |
|---|---|
| Login Kandidat | http://localhost:5173/login |
| Register Kandidat | http://localhost:5173/register |
| Login Perusahaan | http://localhost:5173/company/login |
| Register Perusahaan | http://localhost:5173/company/register |

---

## 📁 Struktur Project

```
19MJ/
├── BE/                     ← Backend (Express + PostgreSQL)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js       ← Koneksi PostgreSQL
│   │   │   └── passport.js ← Google OAuth strategy
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js ← JWT protect
│   │   ├── routes/
│   │   │   └── authRoutes.js
│   │   └── index.js        ← Entry point backend
│   ├── schema.sql          ← Script buat tabel database
│   └── .env                ← ⚠️ Tidak di-commit (buat manual)
│
└── FE/                     ← Frontend (React + Vite)
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx           ← /login
    │   │   ├── LoginCompany.jsx    ← /company/login
    │   │   ├── RegisterCandidate.jsx ← /register
    │   │   ├── RegisterCompany.jsx ← /company/register
    │   │   ├── AuthCallback.jsx    ← /auth/callback (Google OAuth)
    │   │   └── Auth.css            ← Styling semua halaman auth
    │   ├── utils/
    │   │   └── api.js              ← Helper fetch ke backend
    │   └── App.jsx                 ← Routing
    ├── index.html          ← Entry point Vite
    └── .env                ← ⚠️ Tidak di-commit (buat manual)
```

---

## 🌿 Git Workflow

```bash
# Ambil update terbaru
git checkout dev
git pull origin dev

# Mulai fitur baru
git checkout -b feature/US-XXX-nama-fitur

# Commit
git add .
git commit -m "feat(scope): deskripsi

Refs: US-XXX"

# Push & buat PR
git push origin feature/US-XXX-nama-fitur
```

**Branch**: `main` (production) ← `dev` (integration) ← `feature/*` (work)

---

## 👥 Tim Sprint 1

| Nama | Role |
|---|---|
| Novian | Backend Lead |
| Kevin | Frontend |
| Dzaky | Database |
| QA | Novian |