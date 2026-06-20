# Panduan Instalasi dan Deployment 19MJ

Dokumen ini memuat prosedur teknis untuk melakukan instalasi, konfigurasi, dan *deployment* aplikasi 19MJ AI Career Platform di lingkungan lokal dengan mengekspos layanan melalui *tunneling* Ngrok. 

---

## 1. Persiapan Perangkat Lunak Dasar (Prerequisites)

Karena proses *deployment* dilakukan pada perangkat komputer baru, pastikan seluruh perangkat lunak esensial berikut telah diunduh dan diinstal terlebih dahulu:

1. **Git**: Digunakan untuk mengunduh kode sumber aplikasi dari repositori. ([Tautan Unduhan](https://git-scm.com/))
2. **Node.js (LTS)**: Lingkungan eksekusi untuk backend dan frontend. Pemasangan Node.js sudah mencakup NPM (*Node Package Manager*). ([Tautan Unduhan](https://nodejs.org/))
3. **PostgreSQL**: Sistem manajemen basis data. Catat kata sandi akun `postgres` yang dibuat pada saat instalasi. ([Tautan Unduhan](https://www.postgresql.org/download/))
4. **Python**: Lingkungan eksekusi untuk microservice AI lokal. Pasang versi 3.10 atau yang lebih baru. ([Tautan Unduhan](https://www.python.org/downloads/))
5. **uv**: Manajer paket Python berkinerja tinggi. Pasang secara global melalui terminal menggunakan perintah:
   ```bash
   pip install uv
   ```

---

## 2. Konfigurasi Kredensial dan API Key

Sistem 19MJ memerlukan integrasi dengan beberapa layanan pihak ketiga. Langkah pertama yang harus dilakukan adalah mendaftarkan proyek dan mendapatkan kunci otentikasi (API Key) dari masing-masing platform.

### 2.1. Google OAuth 2.0
Kredensial ini digunakan untuk fitur otentikasi pengguna (Login via Google).
1. Akses [Google Cloud Console](https://console.cloud.google.com).
2. Buat proyek baru dan navigasikan ke menu **APIs & Services** > **Credentials**.
3. Pilih opsi **Create Credentials** > **OAuth client ID**.
4. Pilih tipe aplikasi **Web application**.
5. Kosongkan bagian *Authorized redirect URIs* untuk sementara (akan diisi pada tahap konfigurasi Ngrok).
6. Simpan nilai `Client ID` dan `Client Secret`.

![Ilustrasi Pembuatan Kredensial OAuth di Google Cloud Console](path/to/gambar_google_oauth.png)

### 2.2. Google AI Studio
Kredensial ini digunakan untuk fitur pemrosesan *Large Language Model* (LLM) utama.
1. Akses [Google AI Studio](https://aistudio.google.com/).
2. Buat API key baru.
3. Simpan nilai API Key tersebut.

![Ilustrasi Halaman API Key Google AI Studio](path/to/gambar_google_ai_studio.png)

### 2.3. OpenRouter
Kredensial ini digunakan sebagai *fallback model* apabila limitasi layanan Google AI tercapai.
1. Akses [OpenRouter.ai](https://openrouter.ai/).
2. Masuk ke pengaturan akun dan buka menu **Keys**.
3. Buat API Key baru dan simpan nilainya.

![Ilustrasi Halaman Pembuatan API Key OpenRouter](path/to/gambar_openrouter.png)

### 2.4. Resend
Kredensial ini digunakan untuk layanan pengiriman email sistem.
1. Akses [Resend.com](https://resend.com/).
2. Navigasikan ke menu **API Keys**.
3. Buat API Key baru dan simpan nilainya.

![Ilustrasi Halaman API Key Resend](path/to/gambar_resend.png)

### 2.5. Ngrok (Tunneling)
Layanan ini digunakan untuk mempublikasikan port lokal (localhost) ke internet secara aman tanpa memerlukan VPS.
1. Akses [Ngrok.com](https://ngrok.com/) dan daftarkan akun.
2. Unduh perangkat lunak Ngrok sesuai dengan sistem operasi komputer target instalasi.
3. Ekstrak berkas tersebut, kemudian buka dasbor Ngrok pada *browser* dan arahkan ke menu **Your Authtoken**.
4. Salin perintah otentikasi yang diberikan (misal: `ngrok config add-authtoken <TOKEN_ANDA>`) dan jalankan pada terminal untuk mengautentikasi perangkat lokal Anda.

![Ilustrasi Halaman Authtoken Ngrok](path/to/gambar_ngrok_authtoken.png)

---

## 3. Persiapan Repositori dan Basis Data

Buka terminal dan lakukan proses *cloning* repositori aplikasi 19MJ:
```bash
git clone https://github.com/nessorrowz/19MJ.git
cd 19MJ
```

Selanjutnya, siapkan basis data PostgreSQL. Gunakan terminal (psql) atau antarmuka grafis seperti pgAdmin/DBeaver untuk menjalankan perintah berikut:
```sql
CREATE DATABASE 19mj_db;
```
*(Catatan: Struktur tabel akan dibuat dan disinkronisasikan secara otomatis oleh Object-Relational Mapping (ORM) pada saat server dijalankan pertama kali).*

![Ilustrasi Pembuatan Database di pgAdmin atau Terminal](path/to/gambar_database_creation.png)

---

## 4. Konfigurasi dan Deployment Backend (Node.js)

Layanan backend beroperasi pada port 3000 dan harus dipublikasikan ke internet menggunakan Ngrok.

1. Buka terminal baru dan arahkan ke direktori `BE`, kemudian instal dependensi:
   ```bash
   cd BE
   npm install
   ```
2. Buka terminal baru khusus untuk menjalankan *tunneling* Ngrok:
   ```bash
   ngrok http 3000
   ```
   Salin *Forwarding URL* yang diberikan oleh Ngrok (misal: `https://backend-xyz.ngrok-free.app`).

![Ilustrasi Tampilan Terminal Ngrok Backend](path/to/gambar_ngrok_backend.png)

3. Kembali ke direktori `BE`, salin templat konfigurasi *environment*:
   ```bash
   cp .env.example .env
   ```
4. Buka berkas `.env` dan lengkapi konfigurasi berdasarkan kredensial yang didapat pada Bab 2. Gunakan nilai gabungan karakter acak untuk parameter *Secret*:
   ```env
   DB_PASSWORD=masukkan_password_postgres
   
   JWT_SECRET=masukkan_string_acak_disini
   RESET_TOKEN_SECRET=masukkan_string_acak_disini
   
   GOOGLE_CLIENT_ID=masukkan_client_id_google
   GOOGLE_CLIENT_SECRET=masukkan_client_secret_google
   GOOGLE_CALLBACK_URL=https://backend-xyz.ngrok-free.app/api/auth/google/callback
   
   GOOGLE_AI_API_KEY=masukkan_api_key_google_ai
   OPENROUTER_API_KEY=masukkan_api_key_openrouter
   RESEND_API_KEY=masukkan_api_key_resend
   ```
   *(Pastikan `GOOGLE_CALLBACK_URL` menggunakan URL Ngrok yang diperoleh pada langkah 2).*

5. Masuk kembali ke Google Cloud Console, buka konfigurasi kredensial OAuth, lalu tambahkan URL Ngrok dari variabel `GOOGLE_CALLBACK_URL` ke dalam kolom **Authorized redirect URIs**.

![Ilustrasi Pengisian Authorized Redirect URIs di Google Cloud Console](path/to/gambar_authorized_redirect.png)

6. Jalankan layanan backend:
   ```bash
   npm run dev
   ```

---

## 5. Konfigurasi AI STT Service (Python)

Layanan Speech-to-Text dijalankan secara terpisah menggunakan FastAPI dan *faster-whisper*. Layanan ini beroperasi secara lokal pada port 8001 dan tidak perlu di-ekspos melalui Ngrok.

1. Buka terminal baru dan arahkan ke direktori `AI`:
   ```bash
   cd AI
   ```
2. Salin templat konfigurasi *environment*:
   ```bash
   cp .env.example .env
   ```
3. Lakukan instalasi lingkungan virtual dan dependensi menggunakan modul `uv`:
   ```bash
   uv venv
   uv pip install -r requirements.txt
   ```
4. Unduh model pemrosesan:
   ```bash
   ./scripts/download-stt-model.sh
   ```
5. Jalankan layanan FastAPI:
   ```bash
   uv run uvicorn app:app --host 127.0.0.1 --port 8001
   ```

![Ilustrasi Tampilan Terminal FastAPI Berjalan](path/to/gambar_fastapi_running.png)

---

## 6. Konfigurasi dan Deployment Frontend (React/Vite)

Layanan frontend beroperasi pada port 5173 dan harus di-ekspos melalui Ngrok agar dapat diakses oleh publik.

1. Buka terminal baru khusus untuk menjalankan *tunneling* Ngrok:
   ```bash
   ngrok http 5173
   ```
   Salin *Forwarding URL* yang diberikan oleh Ngrok (misal: `https://frontend-xyz.ngrok-free.app`).

![Ilustrasi Tampilan Terminal Ngrok Frontend](path/to/gambar_ngrok_frontend.png)

2. Buka kembali berkas `.env` yang berada di direktori `BE`. Ubah variabel `FE_URL` dan `CORS_ORIGINS` menggunakan URL Ngrok frontend yang baru didapatkan:
   ```env
   FE_URL=https://frontend-xyz.ngrok-free.app
   CORS_ORIGINS=https://frontend-xyz.ngrok-free.app
   ```
   *(Penting: Mulai ulang / restart proses server backend di terminal agar sistem membaca pembaruan berkas `.env`).*

3. Buka terminal baru dan arahkan ke direktori `FE`:
   ```bash
   cd FE
   ```
4. Buat berkas `.env` dan definisikan rute API backend menggunakan URL Ngrok backend:
   ```env
   VITE_API_URL=https://backend-xyz.ngrok-free.app/api
   ```
5. Instal dependensi frontend:
   ```bash
   npm install --legacy-peer-deps
   ```
6. Jalankan layanan frontend:
   ```bash
   npm run dev
   ```

Setelah seluruh proses di atas diselesaikan, aplikasi dapat diakses secara publik melalui URL Ngrok frontend.

![Ilustrasi Tampilan Halaman Utama Aplikasi via Ngrok](path/to/gambar_hasil_akhir_aplikasi.png)
