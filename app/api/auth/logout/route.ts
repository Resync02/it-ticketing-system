
import { NextRequest, NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const expectedOrigin = new URL(request.url).origin;

    // Validasi asal permintaan.
    if (!origin || origin !== expectedOrigin) {
      return NextResponse.json(
        {
          success: false,
          message: "Permintaan tidak valid.",
        },
        { status: 403 }
      );
    }

    // Hapus session Admin.
    await destroyAdminSession();

    return NextResponse.json(
      {
        success: true,
        message: "Logout berhasil.",
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Admin logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Logout gagal. Silakan coba kembali.",
      },
      { status: 500 }
    );
  }
}
