
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// =========================================
// TIPE DATA
// =========================================

type PICInput = {
  id?: unknown;
  action?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
};

type ValidatedPICFields =
  | {
      valid: true;
      name: string;
      email: string | null;
      phone: string | null;
    }
  | {
      valid: false;
      error: string;
    };

// =========================================
// HELPER VALIDASI OBJECT
// =========================================

function isObject(value: unknown): value is PICInput {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// =========================================
// VALIDASI DATA PIC
// =========================================

function validatePICFields(
  input: PICInput
): ValidatedPICFields {
  if (typeof input.name !== "string") {
    return {
      valid: false,
      error: "Nama PIC wajib diisi.",
    };
  }

  const name = input.name.trim();

  const email =
    typeof input.email === "string"
      ? input.email.trim()
      : input.email == null
        ? ""
        : null;

  const phone =
    typeof input.phone === "string"
      ? input.phone.trim()
      : input.phone == null
        ? ""
        : null;

  // Validasi nama
  if (!name) {
    return {
      valid: false,
      error: "Nama PIC wajib diisi.",
    };
  }

  if (name.length > 150) {
    return {
      valid: false,
      error: "Nama PIC maksimal 150 karakter.",
    };
  }

  // Validasi tipe email dan telepon
  if (email === null || phone === null) {
    return {
      valid: false,
      error: "Format email atau nomor telepon tidak valid.",
    };
  }

  // Validasi email
  if (email.length > 190) {
    return {
      valid: false,
      error: "Email maksimal 190 karakter.",
    };
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return {
      valid: false,
      error: "Format email tidak valid.",
    };
  }

  // Validasi nomor telepon
  if (phone.length > 30) {
    return {
      valid: false,
      error: "Nomor telepon maksimal 30 karakter.",
    };
  }

  if (phone) {
    const digits = phone.replace(/\D/g, "");

    if (
      !/^\+?[0-9][0-9\s().-]*$/.test(phone) ||
      digits.length < 9 ||
      digits.length > 15
    ) {
      return {
        valid: false,
        error: "Nomor telepon harus terdiri dari 9–15 digit.",
      };
    }
  }

  return {
    valid: true,
    name,
    email: email || null,
    phone: phone || null,
  };
}

// =========================================
// VALIDASI ID PIC
// =========================================

function validatePICId(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    return null;
  }

  const raw = String(value);

  if (!/^[1-9]\d*$/.test(raw)) {
    return null;
  }

  const id = Number(raw);

  return Number.isSafeInteger(id) ? id : null;
}

// =========================================
// MEMBACA REQUEST BODY
// =========================================

async function getRequestBody(
  request: NextRequest
): Promise<PICInput | null> {
  try {
    const body: unknown = await request.json();

    return isObject(body) ? body : null;
  } catch {
    return null;
  }
}

// =========================================
// RESPONSE ERROR
// =========================================

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// =========================================
// GET: MENGAMBIL DAFTAR PIC
// ADMIN ONLY
// =========================================

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          name,
          email,
          phone,
          is_active,
          created_at
        FROM ticket_pics
        ORDER BY is_active DESC, name ASC
      `
    );

    return NextResponse.json(
      {
        success: true,
        pics: rows,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("GET PIC error:", error);

    return jsonError(
      "Gagal mengambil data PIC.",
      500
    );
  }
}

// =========================================
// POST: MENAMBAHKAN PIC
// ADMIN ONLY
// =========================================

export async function POST(request: NextRequest) {
  const session = await getAdminSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const body = await getRequestBody(request);

  if (!body) {
    return jsonError(
      "Format permintaan tidak valid.",
      400
    );
  }

  const validated = validatePICFields(body);

  if (!validated.valid) {
    return jsonError(validated.error, 400);
  }

  try {
    await pool.execute(
      `
        INSERT INTO ticket_pics (
          name,
          email,
          phone,
          is_active
        )
        VALUES (?, ?, ?, 1)
      `,
      [
        validated.name,
        validated.email,
        validated.phone,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "PIC berhasil ditambahkan.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST PIC error:", error);

    return jsonError(
      "Gagal menambahkan PIC.",
      500
    );
  }
}

// =========================================
// PATCH: UPDATE / TOGGLE PIC
// ADMIN ONLY
// =========================================

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const body = await getRequestBody(request);

  if (!body) {
    return jsonError(
      "Format permintaan tidak valid.",
      400
    );
  }

  // Validasi ID
  const id = validatePICId(body.id);

  if (id === null) {
    return jsonError(
      "ID PIC tidak valid.",
      400
    );
  }

  // Validasi action
  if (
    body.action !== undefined &&
    body.action !== "toggle" &&
    body.action !== "update"
  ) {
    return jsonError(
      "Action tidak valid.",
      400
    );
  }

  try {
    // =====================================
    // TOGGLE STATUS PIC
    // =====================================

    if (body.action === "toggle") {
      const [result] = await pool.execute(
        `
          UPDATE ticket_pics
          SET is_active = IF(is_active = 1, 0, 1)
          WHERE id = ?
        `,
        [id]
      );

      const affectedRows = (
        result as { affectedRows: number }
      ).affectedRows;

      if (affectedRows === 0) {
        return jsonError(
          "PIC tidak ditemukan.",
          404
        );
      }

      return NextResponse.json({
        success: true,
        message: "Status PIC berhasil diperbarui.",
      });
    }

    // =====================================
    // UPDATE DATA PIC
    // =====================================

    const validated = validatePICFields(body);

    if (!validated.valid) {
      return jsonError(validated.error, 400);
    }

    // Pastikan PIC tersedia.
    const [existingRows] = await pool.execute(
      `
        SELECT id
        FROM ticket_pics
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!(existingRows as unknown[]).length) {
      return jsonError(
        "PIC tidak ditemukan.",
        404
      );
    }

    // Update informasi PIC.
    await pool.execute(
      `
        UPDATE ticket_pics
        SET
          name = ?,
          email = ?,
          phone = ?
        WHERE id = ?
      `,
      [
        validated.name,
        validated.email,
        validated.phone,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Data PIC berhasil diperbarui.",
    });
  } catch (error) {
    console.error("PATCH PIC error:", error);

    return jsonError(
      "Gagal memperbarui data PIC.",
      500
    );
  }
}