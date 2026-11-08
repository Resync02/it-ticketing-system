# IT Ticketing System

Aplikasi ticketing internal untuk **PT Wira Griya** yang digunakan untuk mengelola laporan kendala IT, penugasan teknisi, proses penanganan, hingga dokumentasi penyelesaian tiket.

## Fitur Utama

- **Ticket Submission:** Form pengajuan kendala IT untuk karyawan.
- **Ticket Management:** Pengelolaan, persetujuan, dan penentuan prioritas tiket.
- **PIC Management:** Pengelolaan Person in Charge (PIC).
- **Worklog:** Pencatatan analisis, penyebab masalah, tindakan perbaikan, penggantian komponen, dan biaya.
- **Ticket Resolution:** Pengelolaan hasil penanganan tiket.
- **Attachment Management:** Upload foto kendala dan bukti penyelesaian.
- **Ticket History:** Riwayat tiket yang telah ditutup.
- **Dashboard:** Ringkasan aktivitas dan statistik tiket.
- **Excel Export:** Ekspor laporan melalui fitur aplikasi.

## Teknologi

| Teknologi | Penggunaan |
|---|---|
| Next.js 16 | Framework aplikasi |
| React 19 | User interface |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| MySQL / MariaDB | Database |
| mysql2 | Database connection |
| jose | JWT authentication |
| bcryptjs | Password hashing |
| XLSX | Spreadsheet processing |
| Lucide React | Icon library |

## Persyaratan Sistem

Versi yang digunakan selama pengembangan:

- Node.js 22.x
- npm 11.x
- MySQL / MariaDB
- XAMPP (untuk lingkungan pengembangan lokal)

## Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/<USERNAME>/it-ticketing-system.git
```

### 2. Masuk ke Folder Project

```bash
cd it-ticketing-system
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Buat Database

Buat database melalui phpMyAdmin atau MySQL:

```sql
CREATE DATABASE it_ticketing_system;
```

Pastikan seluruh struktur tabel aplikasi telah diimpor atau dibuat sebelum menjalankan aplikasi.

Tabel utama yang digunakan:

- `admin_users`
- `tickets`
- `ticket_pics`
- `ticket_attachments`
- `ticket_comments`
- `ticket_status_history`
- `audit_logs`

### 5. Konfigurasi Environment

Buat file `.env.local` pada root project:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=it_ticketing_system
DB_USER=root
DB_PASSWORD=

AUTH_SECRET=MASUKKAN_SECRET_HASIL_GENERATE
```

Sesuaikan konfigurasi database dengan lingkungan masing-masing.

**Penting:** `.env.local` tidak boleh diunggah ke GitHub.

## Membuat Password Hash dan AUTH_SECRET

Project menggunakan bcryptjs untuk hashing password dan `AUTH_SECRET` untuk keamanan session.

### 1. Generate Password Hash

Jalankan melalui terminal:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Your Password', 12).then(console.log)"
```

Ganti `Your Password` dengan password Admin yang ingin digunakan.

Salin hasil hash untuk digunakan pada SQL pembuatan akun Admin.

### 2. Generate AUTH_SECRET

Jalankan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Salin hasilnya ke variabel `AUTH_SECRET` pada `.env.local`.

Jangan membagikan atau mengunggah nilai secret ke repository publik.

---

# SQL Commands Penting

Dua perintah SQL berikut disediakan untuk membantu proses instalasi awal dan pengelolaan database.

## 1. Menambahkan Akun Admin

Gunakan perintah berikut untuk membuat akun administrator pertama.

Sebelum menjalankan query, generate password hash menggunakan perintah Node.js pada bagian sebelumnya.

```sql
USE it_ticketing_system;

INSERT INTO admin_users (
    name,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
)
VALUES (
    'Administrator',
    'admin@example.com',
    'GANTI_DENGAN_HASH_BCRYPT',
    'admin',
    1,
    NOW(),
    NOW()
);
```

**Keterangan:**

- `name`: Nama administrator.
- `email`: Email untuk login.
- `password_hash`: Hash password hasil generate bcrypt.
- `role`: Gunakan `admin` untuk administrator.
- `is_active`: `1` berarti akun aktif.
- `created_at` dan `updated_at`: Waktu pembuatan akun.

Pastikan email belum digunakan oleh akun lain karena kolom email memiliki unique constraint.

Jangan menggunakan password atau hash contoh untuk server produksi.

## 2. Mengosongkan Seluruh Tabel Database

> **PERINGATAN: OPERASI DESTRUKTIF**
>
> Perintah ini akan menghapus seluruh data dari semua tabel dalam database `it_ticketing_system`, termasuk:
>
> - Akun Admin.
> - Data tiket.
> - Data PIC.
> - Lampiran dan foto tiket.
> - Komentar.
> - Riwayat status.
> - Audit log.
>
> Struktur tabel tetap dipertahankan, tetapi seluruh data akan dihapus dan nilai AUTO_INCREMENT direset.
>
> Operasi TRUNCATE tidak dapat dibatalkan menggunakan ROLLBACK. Lakukan backup terlebih dahulu dan jangan menjalankannya pada database produksi.

```sql
USE it_ticketing_system;

DROP PROCEDURE IF EXISTS empty_ticketing_database;

DELIMITER //

CREATE PROCEDURE empty_ticketing_database()
BEGIN
    DECLARE finished INT DEFAULT 0;
    DECLARE tableName VARCHAR(64);

    DECLARE cur CURSOR FOR
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = 'it_ticketing_system'
          AND TABLE_TYPE = 'BASE TABLE';

    DECLARE CONTINUE HANDLER FOR NOT FOUND
        SET finished = 1;

    SET FOREIGN_KEY_CHECKS = 0;

    OPEN cur;

    truncate_loop: LOOP
        FETCH cur INTO tableName;

        IF finished = 1 THEN
            LEAVE truncate_loop;
        END IF;

        SET @sql = CONCAT(
            'TRUNCATE TABLE `it_ticketing_system`.`',
            REPLACE(tableName, '`', '``'),
            '`'
        );

        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;

    CLOSE cur;

    SET FOREIGN_KEY_CHECKS = 1;
END//

DELIMITER ;

CALL empty_ticketing_database();

DROP PROCEDURE empty_ticketing_database;
```

**Setelah database dikosongkan:**

Buat kembali akun Admin menggunakan SQL pada bagian pertama sebelum mencoba login.

---

## Menjalankan Aplikasi

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Production Start

```bash
npm run start
```

### Code Validation

```bash
npm run lint
npx tsc --noEmit
```

## URL Aplikasi

Saat dijalankan secara lokal menggunakan port 3000:

| Halaman | URL |
|---|---|
| Form Pengajuan Tiket | `http://localhost:3000/ticketingsystem` |
| Admin Login | `http://localhost:3000/admin/login` |
| Admin Dashboard | `http://localhost:3000/admin/home` |
| Ticket Management | `http://localhost:3000/admin/tickets` |
| Ticket History | `http://localhost:3000/admin/history` |
| PIC Management | `http://localhost:3000/admin/administrators` |

Form pengajuan tiket dapat diakses secara publik. Halaman administrasi dan endpoint internal memerlukan autentikasi.

## Persiapan Deployment

Sebelum memublikasikan aplikasi ke server produksi, perhatikan beberapa hal berikut:

- Gunakan database produksi yang terpisah dari database lokal.
- Konfigurasikan environment variables melalui server hosting.
- Gunakan HTTPS.
- Buat akun database khusus aplikasi dengan hak akses minimum.
- Pastikan endpoint internal dilindungi autentikasi dan otorisasi.
- Terapkan rate limiting pada form pengajuan tiket publik.
- Siapkan backup database dan lampiran.
- Uji proses pemulihan backup.
- Jangan menyimpan kredensial di source code.

## Repository

**Project Name:** IT Ticketing System

**Organization:** PT Wira Griya

**Repository:** `it-ticketing-system`

---

Developed for internal IT Support and ticket management operations.
