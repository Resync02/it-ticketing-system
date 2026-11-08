
import { connection, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  // Pastikan endpoint hanya berjalan saat ada request masuk,
  // bukan ketika Next.js melakukan prerender saat build.
  await connection();

  // Batasi akses hanya untuk Admin yang sudah login.
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Akses tidak diizinkan.",
      },
      { status: 401 }
    );
  }

  try {
    // Tes koneksi tanpa mengambil informasi internal database.
    await pool.query("SELECT 1");

    return NextResponse.json({
      success: true,
      message: "Koneksi database berhasil.",
    });
  } catch (error) {
    // Detail error hanya disimpan di log server.
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Koneksi database gagal.",
      },
      { status: 503 }
    );
  }
}
