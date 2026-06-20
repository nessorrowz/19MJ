# Dokumen User Guide untuk Instalasi / Deployment

## 1. Clone repository ke sistem lokal yang akan digunakan untuk menjalankan web.
Repositori ini bersifat publik, sehingga Anda dapat langsung melakukan *cloning* tanpa memerlukan *Personal Access Token* (PAT) atau konfigurasi otentikasi tambahan.

Buka terminal di komputer Anda, lalu jalankan *command* berikut:
```bash
git clone https://github.com/nessorrowz/19MJ.git
cd 19MJ
```

---

## 2. Siapkan konfigurasi Backend dan Frontend
Sistem 19MJ membutuhkan beberapa parameter *environment* khusus agar dapat berkomunikasi dengan sistem otentikasi pihak ketiga dan AI.

**a. Backend:** 
Masuk ke directory `./BE`, kemudian salin file `.env.example`, ubah nama filenya jadi `.env`, dan lengkapi konfigurasi utama seperti koneksi PostgreSQL, JWT, OAuth, dan API Keys:
```env
PORT=3000
FE_URL=http://localhost:5173

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=19mj_db
DB_USER=postgres
DB_PASSWORD=<password_anda>

# Security & Authentication
JWT_SECRET=19mjkey
JWT_EXPIRES_IN=1y

# Google OAuth (Untuk Login via Google)
GOOGLE_CLIENT_ID=<client_id_anda>
GOOGLE_CLIENT_SECRET=<client_secret_anda>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# AI APIs (Untuk fitur AI)
GOOGLE_AI_API_KEY=<api_key_anda>
OPENROUTER_API_KEY=<api_key_anda>
```

**b. Frontend:** 
Secara *default*, *frontend* diatur untuk berkomunikasi dengan *backend* di `http://localhost:3000`. Jika Anda tidak merubah *port* default di atas, Anda tidak perlu mengubah konfigurasi apapun di Frontend.

---

## 3. Lakukan Persiapan Database PostgreSQL
Pastikan aplikasi dan *service* PostgreSQL telah diinstal dan sedang berjalan di komputer lokal Anda.

Buka antarmuka PostgreSQL (melalui Terminal, pgAdmin, atau DBeaver), kemudian jalankan perintah SQL berikut untuk membuat *database* kosong:
```sql
CREATE DATABASE 19mj_db;
```
*(Tidak perlu membuat tabel secara manual. Sistem backend 19MJ menggunakan ORM yang akan otomatis membuat dan menyinkronkan seluruh tabel ke database saat server pertama kali dinyalakan).*

---

## 4. Jalankan proses deployment (Local Development)

Sistem 19MJ berjalan menggunakan `npm` untuk proses dependensi dan eksekusinya. Lakukan langkah-langkah di bawah secara paralel (di dua jendela terminal yang berbeda).

**a. Instalasi dan jalankan Backend:**
```bash
cd BE
npm install
npm run dev
```
*(Server backend akan berjalan di `http://localhost:3000`)*

**b. Instalasi dan jalankan Frontend:**
Buka terminal baru di *root directory*, kemudian jalankan:
```bash
cd FE
npm install --legacy-peer-deps
npm run dev
```
*(Aplikasi antarmuka akan berjalan di `http://localhost:5173`)*

Setelah kedua *server* aktif, buka peramban (*browser*) Anda dan masuk ke alamat `http://localhost:5173` untuk mengakses aplikasi 19MJ sepenuhnya.
