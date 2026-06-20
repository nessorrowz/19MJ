# Dokumen User Guide untuk Instalasi / Deployment

## 1. Clone repository ke server / VPS yang akan digunakan untuk deploy web.
Pastikan akun GitHub mempunyai hak akses dalam repositorynya.

Untuk *cloning*, salin URL HTTPS yang ada di bagian “Code”, kemudian *clone* repository dengan command berikut:
```bash
git clone https://github.com/nessorrowz/19MJ.git origin main
```

Untuk repository private, diwajibkan untuk memasukkan username dan Personal Access Token (PAT) GitHub. Untuk membuat PAT bisa ke bagian **“Developer settings”**.

Kemudian pada bagian **“Personal access tokens”**, buka **“Tokens (classic)”** dan buat token baru dengan klik **“Generate new token”** dan pilih **“Generate new token (classic)”**.

Setelah itu, cukup centang bagian **“repo”** dan jika sudah selesai, klik **“Generate token”**.

> **Catatan Penting:** Jangan lupa untuk *copy* token yang sudah dibuat karena PAT hanya bisa dilihat dan disalin sekali saja.

---

## 2. Siapkan konfigurasi Backend dan Frontend
Sesuaikan dengan acuan arsitektur sistem 19MJ.

**a. Backend:** 
Masuk ke directory `./BE`, kemudian salin file `.env.example`, ubah nama filenya jadi `.env`, dan lengkapi konfigurasi utama seperti koneksi PostgreSQL, JWT, OAuth, dan API Keys (Groq/Google AI):
```env
PORT=3000
FE_URL=http://localhost:5173

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=19mj_db
DB_USER=postgres
DB_PASSWORD=<password_anda>

# APIs
JWT_SECRET=19mjkey
GOOGLE_AI_API_KEY=<api_key_anda>
```

**b. Frontend:** 
Secara *default*, *frontend* akan berkomunikasi dengan *backend* di `http://localhost:3000`. Jika *deploy* ke produksi, sesuaikan URL API pada file `utils/api.js` (atau `.env` frontend jika ada) agar mengarah ke domain backend Anda.

---

## 3. Jalankan proses deployment dengan NPM (Node Package Manager)

Berbeda dengan proyek lain yang menggunakan Docker, 19MJ berjalan secara langsung di atas *environment* Node.js.

**a. Jalankan instalasi dan jalankan Backend:**
```bash
cd BE
npm install
npm run dev
```

**b. Jalankan instalasi dan jalankan Frontend:**
Buka terminal baru, kemudian jalankan:
```bash
cd FE
npm install --legacy-peer-deps
npm run dev
```
Aplikasi kini berjalan di `http://localhost:5173` (Frontend) dan `http://localhost:3000` (Backend).

Untuk menjalankan secara permanen di server (Production), disarankan menggunakan `pm2`:
```bash
# Backend
pm2 start src/index.js --name "19mj-backend"

# Frontend
npm run build
pm2 serve dist 5173 --name "19mj-frontend"
```

---

## 4. Lakukan Persiapan Database PostgreSQL
Pastikan layanan PostgreSQL berjalan di server Anda. Buat database sesuai dengan nama yang Anda masukkan di file `.env` (contoh: `19mj_db`).

```sql
CREATE DATABASE 19mj_db;
```
*(Sistem backend 19MJ akan secara otomatis melakukan pembuatan dan sinkronisasi tabel saat pertama kali dijalankan).*

---

## 5. Lakukan setup HTTPS agar website yang di-deploy menggunakan HTTPS.
Sebelum itu, siapkan file `.crt` dan `.key` untuk certificate HTTPS untuk websitenya.

Lalu, di server / VPS, tambahkan konfigurasi ini di `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 443 ssl;
    server_name <isi dengan URL / IP website>;

    ssl_certificate /etc/ssl/private/<nama file>.crt;
    ssl_certificate_key /etc/ssl/private/<nama file>.key;

    client_max_body_size 100M;

    # Konfigurasi Frontend
    location / {
        proxy_pass http://127.0.0.1:5173; # Port Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Konfigurasi Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/; # Port Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

Setelah ditambahkan, jalankan command berikut untuk restart service nginx yang akan digunakan sebagai web server HTTPS:
```bash
sudo systemctl restart nginx
```
