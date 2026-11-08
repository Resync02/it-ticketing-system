
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

loadEnvConfig(process.cwd());

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;

  if (!name || !email || !password) {
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL, dan ADMIN_PASSWORD wajib diisi di .env.local."
    );
  }

  if (password.length < 12) {
    throw new Error("Password admin minimal 12 karakter.");
  }

  if (!dbName || !dbUser) {
    throw new Error("Konfigurasi DB_NAME atau DB_USER belum diisi.");
  }

  if (name.length > 150 || email.length > 190) {
    throw new Error("Nama atau email melebihi batas karakter.");
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    database: dbName,
    user: dbUser,
    password: process.env.DB_PASSWORD ?? "",
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    // Cek email tertentu, bukan mengecek seluruh admin.
    const [rows] = await pool.execute(
      "SELECT id FROM admin_users WHERE email = ? LIMIT 1",
      [email]
    );

    if ((rows as { id: number }[]).length > 0) {
      throw new Error("Email tersebut sudah terdaftar.");
    }

    // Password disimpan dalam bentuk bcrypt hash.
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO admin_users
        (name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'admin', 1)`,
      [name, email, passwordHash]
    );

    console.log("Admin berhasil ditambahkan.");
    console.log(`Nama  : ${name}`);
    console.log(`Email : ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan.";

  console.error("Gagal membuat admin:", message);
  process.exitCode = 1;
});
