
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { createAdminSession } from "@/lib/auth";
import { ResultSetHeader } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    // Mencegah login lintas situs dari origin yang berbeda.
    const origin = request.headers.get("origin");

    if (
      origin &&
      origin !== new URL(request.url).origin
    ) {
      return NextResponse.json(
        { message: "Permintaan tidak valid." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.email.length > 190 ||
      body.password.length > 200
    ) {
      return NextResponse.json(
        { message: "Email atau password tidak valid." },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    const [rows] = await pool.execute(
      `SELECT id, name, email, password_hash
       FROM admin_users
       WHERE email = ? AND role = 'admin' AND is_active = 1
       LIMIT 1`,
      [email]
    );

    const admins = rows as {
      id: number;
      name: string;
      email: string;
      password_hash: string;
    }[];

    const admin = admins[0];

    if (
      !admin ||
      !(await bcrypt.compare(password, admin.password_hash))
    ) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 }
      );
    }

    const [updateResult] = await pool.execute<ResultSetHeader>(
      `UPDATE admin_users
      SET last_login_at = NOW()
      WHERE id = ?
        AND role = 'admin'
        AND is_active = 1`,
      [admin.id]
    );

    if (updateResult.affectedRows !== 1) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 }
      );
    }

    await createAdminSession({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    });

    return NextResponse.json({
      message: "Login berhasil.",
      redirectTo: "/admin/home",
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
