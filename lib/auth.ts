
import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import pool from "@/lib/db";

const COOKIE_NAME = "wg_admin_session";
const SESSION_DURATION = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET belum dikonfigurasi dengan benar."
    );
  }

  return new TextEncoder().encode(secret);
}

// =========================================
// MEMBUAT SESSION ADMIN
// =========================================

export async function createAdminSession(admin: {
  id: number | string;
  name: string;
  email: string;
}) {
  const token = await new SignJWT({
    name: admin.name,
    email: admin.email,
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

// =========================================
// MEMERIKSA SESSION ADMIN
// =========================================

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  let payload;

  // Verifikasi tanda tangan dan masa berlaku JWT.
  try {
    const verified = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    payload = verified.payload;
  } catch {
    return null;
  }

  if (
    !payload.sub ||
    !payload.sub.trim() ||
    payload.role !== "admin"
  ) {
    return null;
  }

  // Periksa kembali status akun pada database.
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email
       FROM admin_users
       WHERE id = ?
         AND role = 'admin'
         AND is_active = 1
       LIMIT 1`,
      [payload.sub]
    );

    const admins = rows as {
      id: number | string;
      name: string;
      email: string;
    }[];

    const admin = admins[0];

    // Akun sudah tidak aktif atau tidak ditemukan.
    if (!admin) {
      return null;
    }

    return {
      id: String(admin.id),
      name: admin.name,
      email: admin.email,
      role: "admin" as const,
    };
  } catch (error) {
    // Gagal memverifikasi database:
    // akses ditolak (fail closed).
    console.error(
      "Admin session validation failed:",
      error
    );

    return null;
  }
}

// =========================================
// MENGHAPUS SESSION ADMIN
// =========================================

export async function destroyAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}