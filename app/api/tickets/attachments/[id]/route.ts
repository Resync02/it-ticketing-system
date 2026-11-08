
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// =========================================
// TIPE DATA
// =========================================

type AttachmentRow = {
  file_data: Buffer;
  mime_type: string;
};

// =========================================
// VALIDASI MIME TYPE
// =========================================

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// =========================================
// VALIDASI FILE BERDASARKAN MAGIC BYTES
// =========================================

function isValidImage(
  bytes: Buffer,
  mimeType: string
): boolean {
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([
          137, 80, 78, 71, 13, 10, 26, 10,
        ])
      )
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
}

// =========================================
// GET: MENGAMBIL LAMPIRAN TIKET
// ADMIN ONLY
// =========================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // 1. Validasi session Admin
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // 2. Validasi ID lampiran
    const { id } = await context.params;

    if (!/^[1-9]\d{0,19}$/.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "ID lampiran tidak valid.",
        },
        { status: 400 }
      );
    }

    // 3. Ambil data lampiran
    const [rows] = await pool.execute(
      `
        SELECT
          file_data,
          mime_type
        FROM ticket_attachments
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    const attachments = rows as AttachmentRow[];

    if (attachments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Lampiran tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const attachment = attachments[0];

    // 4. Validasi MIME type
    if (
      !ALLOWED_MIME_TYPES.includes(
        attachment.mime_type
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Format gambar tidak diizinkan.",
        },
        { status: 415 }
      );
    }

    // 5. Konversi binary
    const imageBuffer = Buffer.from(
      attachment.file_data
    );

    // 6. Validasi signature binary
    if (
      !isValidImage(
        imageBuffer,
        attachment.mime_type
      )
    ) {
      console.error(
        "Invalid attachment signature:",
        id
      );

      return NextResponse.json(
        {
          success: false,
          error: "Lampiran tidak dapat ditampilkan.",
        },
        { status: 500 }
      );
    }

    // 7. Kirim gambar ke browser
    return new NextResponse(
      new Uint8Array(imageBuffer),
      {
        status: 200,
        headers: {
          "Content-Type": attachment.mime_type,
          "Content-Length": String(
            imageBuffer.length
          ),
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control":
            "private, no-store, max-age=0",
          "Cross-Origin-Resource-Policy":
            "same-origin",
          "Referrer-Policy": "no-referrer",
        },
      }
    );
  } catch (error) {
    // Detail hanya disimpan di server.
    console.error(
      "GET ticket attachment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil gambar lampiran.",
      },
      { status: 500 }
    );
  }
}
