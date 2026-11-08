
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import pool from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// =====================================================
// KONFIGURASI
// =====================================================

const MAX_PHOTO_SIZE = 4 * 1024 * 1024;
const MAX_REQUEST_BODY_SIZE = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_PHOTO_SIZE / 3) * 4;

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const ALLOWED_PREVIOUS_VALUES = [
  "Pernah",
  "Belum",
  "Tidak Tahu",
] as const;

const ALLOWED_OUTCOMES = [
  "Selesai",
  "Belum selesai",
  "Tidak bisa diselesaikan",
] as const;

type ResolutionResult = (typeof ALLOWED_OUTCOMES)[number];

// =====================================================
// HELPER
// =====================================================

function getText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidPhoto(
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
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
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

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function sanitizeFileName(
  value: string,
  fallback: string
): string {
  const cleaned = value
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 255);

  return cleaned || fallback;
}

function isValidBase64(value: string): boolean {
  const base64Pattern =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  return (
    value.length > 0 &&
    value.length <= MAX_BASE64_LENGTH &&
    base64Pattern.test(value)
  );
}

// =====================================================
// GET: ADMIN - MENGAMBIL DATA TIKET
// =====================================================

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    const [rows] = await pool.execute(
      `
        SELECT
          t.id AS database_id,
          t.ticket_number,
          t.reporter_name,
          t.reporter_email,
          t.reporter_phone,
          t.division,
          t.location,
          t.device,
          t.issue,
          t.priority,
          t.status,

          DATE_FORMAT(
            t.created_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS created_at,

          DATE_FORMAT(
            t.completed_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS completed_at,

          DATE_FORMAT(
            t.updated_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS updated_at,

          t.device_type,
          t.previous_occurrence,
          t.impact,

          t.initial_analysis,
          t.root_cause,
          t.corrective_action,

          t.part_replaced,
          t.part_replaced_description,
          t.component_cost,

          t.resolution_result,
          t.resolution_reason,

          t.assigned_pic_id,
          p.name AS assigned_pic_name,

          (
            SELECT a.id
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'issue_photo'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS photo_attachment_id,

          (
            SELECT a.file_name
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'issue_photo'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS photo_file_name,

          (
            SELECT a.mime_type
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'issue_photo'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS photo_mime_type,

          (
            SELECT a.file_size
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'issue_photo'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS photo_file_size,

          (
            SELECT a.id
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'proof'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS proof_attachment_id,

          (
            SELECT a.file_name
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'proof'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS proof_file_name,

          (
            SELECT a.mime_type
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'proof'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS proof_mime_type,

          (
            SELECT a.file_size
            FROM ticket_attachments a
            WHERE a.ticket_id = t.id
              AND a.category = 'proof'
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) AS proof_file_size

        FROM tickets t
        LEFT JOIN ticket_pics p
          ON p.id = t.assigned_pic_id

        ORDER BY t.created_at DESC
      `
    );

    // Ambil seluruh metadata lampiran untuk tiket yang ditutup.
    // Data binary tidak dikirim ke browser.
    const [attachmentRows] = await pool.execute(
      `
        SELECT
          a.ticket_id,
          a.id,
          a.category,
          a.file_name,
          a.mime_type,
          a.file_size,

          DATE_FORMAT(
            a.created_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS created_at

        FROM ticket_attachments a

        INNER JOIN tickets t
          ON t.id = a.ticket_id

        WHERE
          t.status IN (
            'Selesai',
            'Tidak bisa diselesaikan'
          )
          OR t.resolution_result IN (
            'Selesai',
            'Tidak bisa diselesaikan'
          )

        ORDER BY
          a.ticket_id ASC,
          a.created_at ASC,
          a.id ASC
      `
    );

    const attachmentsByTicket = new Map<
      string,
      Array<{
        id: string;
        category: string;
        file_name: string;
        mime_type: string;
        file_size: number;
        created_at: string;
      }>
    >();

    for (
      const attachment of attachmentRows as Array<
        Record<string, unknown>
      >
    ) {
      const ticketKey = String(attachment.ticket_id);

      const items =
        attachmentsByTicket.get(ticketKey) ?? [];

      items.push({
        id: String(attachment.id),
        category: String(attachment.category ?? ""),
        file_name: String(attachment.file_name ?? ""),
        mime_type: String(attachment.mime_type ?? ""),
        file_size: Number(attachment.file_size ?? 0),
        created_at: String(attachment.created_at ?? ""),
      });

      attachmentsByTicket.set(ticketKey, items);
    }

    const tickets = (
      rows as Array<Record<string, unknown>>
    ).map((row) => ({
      database_id: String(row.database_id),

      id: String(row.ticket_number),
      ticket_number: String(row.ticket_number),

      name: String(row.reporter_name),
      reporter_name: String(row.reporter_name),

      email: row.reporter_email
        ? String(row.reporter_email)
        : "",

      reporter_email: row.reporter_email
        ? String(row.reporter_email)
        : "",

      reporter_phone: row.reporter_phone
        ? String(row.reporter_phone)
        : "",

      division: String(row.division),
      location: String(row.location),
      device: String(row.device),

      device_type: String(row.device_type ?? ""),
      issue: String(row.issue),
      impact: String(row.impact ?? ""),

      previous_occurrence: String(
        row.previous_occurrence ?? ""
      ),

      priority:
        row.priority === "Safe"
          ? "Rendah"
          : row.priority === "Urgent"
            ? "Tinggi"
            : row.priority as
                | "Rendah"
                | "Medium"
                | "Tinggi"
                | null,

      status: String(row.status ?? "").trim(),

      time:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),

      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),

      completed_at:
        row.completed_at instanceof Date
          ? row.completed_at.toISOString()
          : row.completed_at
            ? String(row.completed_at)
            : null,

      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at ?? ""),

      assigned_pic_id:
        row.assigned_pic_id == null
          ? null
          : String(row.assigned_pic_id),

      assigned_pic_name:
        row.assigned_pic_name
          ? String(row.assigned_pic_name)
          : null,

      initial_analysis: String(
        row.initial_analysis ?? ""
      ),

      root_cause: String(row.root_cause ?? ""),
      corrective_action: String(
        row.corrective_action ?? ""
      ),

      part_replaced: Boolean(row.part_replaced),

      part_replaced_description: String(
        row.part_replaced_description ?? ""
      ),

      component_cost:
        row.component_cost == null
          ? null
          : Number(row.component_cost),

      resolution_result: String(
        row.resolution_result ?? ""
      ),

      resolution_reason: String(
        row.resolution_reason ?? ""
      ),

      photoAttachmentId:
        row.photo_attachment_id == null
          ? null
          : String(row.photo_attachment_id),

      photoFileName:
        row.photo_file_name == null
          ? ""
          : String(row.photo_file_name),

      photoMimeType:
        row.photo_mime_type == null
          ? ""
          : String(row.photo_mime_type),

      photoFileSize:
        row.photo_file_size == null
          ? null
          : Number(row.photo_file_size),

      proofAttachmentId:
        row.proof_attachment_id == null
          ? null
          : String(row.proof_attachment_id),

      proofFileName:
        row.proof_file_name == null
          ? ""
          : String(row.proof_file_name),

      proofMimeType:
        row.proof_mime_type == null
          ? ""
          : String(row.proof_mime_type),

      proofFileSize:
        row.proof_file_size == null
          ? null
          : Number(row.proof_file_size),

      attachments:
        attachmentsByTicket.get(
          String(row.database_id)
        ) ?? [],
    }));

    return NextResponse.json(
      {
        success: true,
        tickets,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("GET tickets error:", error);

    return jsonError(
      "Gagal mengambil data tiket.",
      500
    );
  }
}

// =====================================================
// POST: PUBLIK - MEMBUAT TIKET DAN MENYIMPAN FOTO KE DB
// =====================================================

export async function POST(request: NextRequest) {
  // Periksa ukuran request sebelum membaca multipart body.
  const contentLengthHeader =
    request.headers.get("content-length");

  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);

    if (
      !Number.isFinite(contentLength) ||
      contentLength < 0
    ) {
      return jsonError(
        "Ukuran request tidak valid.",
        400
      );
    }

    if (contentLength > MAX_REQUEST_BODY_SIZE) {
      return jsonError(
        "Ukuran formulir terlalu besar.",
        413
      );
    }
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Format formulir tidak valid.",
      },
      { status: 400 }
    );
  }

  // =============================================
  // MENGAMBIL DATA FORMULIR
  // =============================================

  const reporter_name = getText(
    formData,
    "reporter_name"
  );

  const reporter_email =
    getText(formData, "reporter_email") || null;

  const reporter_phone = getText(
    formData,
    "reporter_phone"
  );

  const division = getText(formData, "division");
  const location = getText(formData, "location");
  const device = getText(formData, "device");
  const device_type = getText(formData, "device_type");

  const previous_occurrence = getText(
    formData,
    "previous_occurrence"
  );

  const issue = getText(formData, "issue");
  const impact = getText(formData, "impact");
  const confirmed = getText(formData, "confirmed");

  const photoValue = formData.get("photo");

  // =============================================
  // VALIDASI FOTO WAJIB
  // =============================================

  if (
    !(photoValue instanceof File) ||
    photoValue.size === 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Foto atau screenshot kendala wajib diunggah.",
      },
      { status: 400 }
    );
  }

  // =============================================
  // VALIDASI FIELD WAJIB
  // =============================================

  if (
    !reporter_name ||
    !reporter_phone ||
    !division ||
    !location ||
    !device ||
    !device_type ||
    !previous_occurrence ||
    !issue ||
    !impact ||
    confirmed !== "yes"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Semua field wajib diisi dan laporan harus dikonfirmasi.",
      },
      { status: 400 }
    );
  }

  // =============================================
  // VALIDASI EMAIL
  // =============================================

  if (
    reporter_email &&
    (
      reporter_email.length > 190 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        reporter_email
      )
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Format email tidak valid.",
      },
      { status: 400 }
    );
  }

  // =============================================
  // VALIDASI NOMOR TELEPON
  // =============================================

  const phoneDigits = reporter_phone.replace(
    /\D/g,
    ""
  );

  if (
    reporter_phone.length > 30 ||
    !/^\+?[0-9][0-9\s().-]*$/.test(
      reporter_phone
    ) ||
    phoneDigits.length < 9 ||
    phoneDigits.length > 15
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Nomor telepon / WhatsApp tidak valid. Gunakan 9–15 digit.",
      },
      { status: 400 }
    );
  }

  // =============================================
  // VALIDASI RIWAYAT KENDALA
  // =============================================

  if (
    !ALLOWED_PREVIOUS_VALUES.includes(
      previous_occurrence as
        (typeof ALLOWED_PREVIOUS_VALUES)[number]
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Pilihan riwayat kendala tidak valid.",
      },
      { status: 400 }
    );
  }

  // =============================================
  // VALIDASI PANJANG KARAKTER
  // =============================================

  if (
    reporter_name.length > 150 ||
    division.length > 120 ||
    location.length > 150 ||
    device.length > 100 ||
    device_type.length > 2000 ||
    issue.length > 10000 ||
    impact.length > 10000
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Ada data yang melebihi batas karakter.",
      },
      { status: 400 }
    );
  }

  // =============================================
  // VALIDASI DAN PERSIAPAN FOTO
  // =============================================

  let photoName: string | null = null;
  let photoMimeType: string | null = null;
  let photoBytes: Buffer | null = null;

  if (photoValue.size > MAX_PHOTO_SIZE) {
    return NextResponse.json(
      {
        success: false,
        message: "Ukuran foto maksimal 4 MB.",
      },
      { status: 400 }
    );
  }

  if (
    !ALLOWED_PHOTO_TYPES.includes(
      photoValue.type as
        (typeof ALLOWED_PHOTO_TYPES)[number]
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Foto harus berformat JPG, PNG, atau WEBP.",
      },
      { status: 400 }
    );
  }

  photoBytes = Buffer.from(
    await photoValue.arrayBuffer()
  );

  if (
    !isValidPhoto(
      photoBytes,
      photoValue.type
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Isi file foto tidak valid.",
      },
      { status: 400 }
    );
  }

  photoName = sanitizeFileName(
    photoValue.name,
    "lampiran"
  );

  photoMimeType = photoValue.type;

  // =============================================
  // MEMBUAT NOMOR TIKET
  // Format dipertahankan agar kompatibel
  // dengan data dan tampilan sebelumnya.
  // =============================================

  const ticketNumber = `WG-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  // =============================================
  // TRANSAKSI PEMBUATAN TIKET
  // =============================================

  let connection:
    | Awaited<ReturnType<typeof pool.getConnection>>
    | undefined;

  let transactionStarted = false;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // =========================================
    // INSERT TIKET
    // =========================================

    const [ticketResult] = await connection.execute(
      `
        INSERT INTO tickets (
          ticket_number,
          reporter_name,
          reporter_email,
          reporter_phone,
          division,
          location,
          device,
          device_type,
          previous_occurrence,
          issue,
          impact,
          priority,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
      `,
      [
        ticketNumber,
        reporter_name,
        reporter_email,
        reporter_phone,
        division,
        location,
        device,
        device_type,
        previous_occurrence,
        issue,
        impact,
        "Menunggu persetujuan",
      ]
    );

    const ticketId = (
      ticketResult as {
        insertId: number | bigint;
      }
    ).insertId;

    // =========================================
    // INSERT FOTO
    // =========================================

    if (
      photoBytes &&
      photoName &&
      photoMimeType
    ) {
      const extension =
        photoMimeType === "image/jpeg"
          ? ".jpg"
          : photoMimeType === "image/png"
            ? ".png"
            : ".webp";

      const storageKey =
        `ticket-${randomUUID()}${extension}`;

      await connection.execute(
        `
          INSERT INTO ticket_attachments (
            ticket_id,
            uploaded_by,
            file_name,
            storage_key,
            mime_type,
            file_size,
            file_data,
            category
          )
          VALUES (?, NULL, ?, ?, ?, ?, ?, 'issue_photo')
        `,
        [
          ticketId,
          photoName,
          storageKey,
          photoMimeType,
          photoBytes.length,
          photoBytes,
        ]
      );
    }

    // =========================================
    // COMMIT
    // =========================================

    await connection.commit();
    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,
        message: "Tiket berhasil dibuat.",
        data: {
          ticket_number: ticketNumber,
          status: "Menunggu persetujuan",
          has_photo: Boolean(photoBytes),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST tickets - Original error:",
      error
    );

    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "POST tickets - Rollback failed:",
          rollbackError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat tiket.",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}

// =====================================================
// PATCH: ADMIN - APPROVE / ASSIGN / WORKLOG / STATUS
// =====================================================

export async function PATCH(request: NextRequest) {
  try {
    // =============================================
    // VALIDASI SESSION
    // =============================================

    const session = await getAdminSession();

    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    // =============================================
    // MEMBACA REQUEST BODY
    // =============================================

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "Format permintaan tidak valid.",
        400
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonError(
        "Permintaan tidak valid.",
        400
      );
    }

    const input = body as Record<string, unknown>;

    const ticketNumber =
      typeof input.ticket_number === "string"
        ? input.ticket_number.trim()
        : "";

    const action = input.action;

    const priority = input.priority;
    const status = input.status;

    if (
      !ticketNumber ||
      ticketNumber.length > 64 ||
      typeof action !== "string"
    ) {
      return jsonError(
        "Nomor tiket dan action wajib diisi.",
        400
      );
    }

    // =============================================
    // ACTION: APPROVE TIKET
    // =============================================

    if (action === "approve") {
      if (
        priority !== "Rendah" &&
        priority !== "Medium" &&
        priority !== "Tinggi"
      ) {
        return jsonError(
          "Prioritas tiket tidak valid.",
          400
        );
      }

      const [result] = await pool.execute(
        `
          UPDATE tickets
          SET
            priority = ?,
            status = 'Belum dikerjakan',
            updated_at = CURRENT_TIMESTAMP
          WHERE ticket_number = ?
            AND status = 'Menunggu persetujuan'
        `,
        [priority, ticketNumber]
      );

      if (
        !(result as { affectedRows: number }).affectedRows
      ) {
        return jsonError(
          "Tiket tidak ditemukan atau sudah diproses.",
          404
        );
      }

      return NextResponse.json({
        success: true,
        message: "Tiket berhasil disetujui.",
      });
    }

    // =============================================
    // ACTION: ASSIGN PIC
    // =============================================

    if (action === "assign_pic") {
      const rawPICId = input.assigned_pic_id;

      if (
        typeof rawPICId !== "number" &&
        typeof rawPICId !== "string"
      ) {
        return jsonError(
          "PIC tidak valid.",
          400
        );
      }

      const picIdText = String(rawPICId);

      if (!/^[1-9]\d*$/.test(picIdText)) {
        return jsonError(
          "PIC tidak valid.",
          400
        );
      }

      const picId = Number(picIdText);

      if (!Number.isSafeInteger(picId)) {
        return jsonError(
          "PIC tidak valid.",
          400
        );
      }

      // Update atomik:
      // - Tiket belum memiliki PIC.
      // - PIC masih aktif pada saat update.
      const [updateResult] = await pool.execute(
        `
          UPDATE tickets
          SET
            assigned_pic_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE ticket_number = ?
            AND assigned_pic_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM ticket_pics p
              WHERE p.id = ?
                AND p.is_active = 1
            )
        `,
        [
          picId,
          ticketNumber,
          picId,
        ]
      );

      const affectedRows = (
        updateResult as { affectedRows: number }
      ).affectedRows;

      if (affectedRows === 1) {
        return NextResponse.json({
          success: true,
          message: "PIC berhasil ditetapkan dan dikunci.",
        });
      }

      // Cari penyebab apabila update tidak mengubah data.
      const [ticketRows] = await pool.execute(
        `
          SELECT id, assigned_pic_id
          FROM tickets
          WHERE ticket_number = ?
          LIMIT 1
        `,
        [ticketNumber]
      );

      const tickets = ticketRows as Array<{
        id: number;
        assigned_pic_id: number | null;
      }>;

      if (tickets.length === 0) {
        return jsonError(
          "Tiket tidak ditemukan.",
          404
        );
      }

      if (tickets[0].assigned_pic_id !== null) {
        return jsonError(
          "PIC sudah ditetapkan dan tidak dapat diubah.",
          409
        );
      }

      return jsonError(
        "PIC tidak ditemukan atau sudah tidak aktif.",
        404
      );
    }

    // =============================================
    // ACTION: SAVE WORKLOG
    // =============================================

    if (action === "save_worklog") {
      // =========================================
      // 1. VALIDASI ANALISA DAN TINDAKAN
      // =========================================

      if (
        typeof input.initial_analysis !== "string" ||
        !input.initial_analysis.trim() ||
        typeof input.root_cause !== "string" ||
        !input.root_cause.trim() ||
        typeof input.corrective_action !== "string" ||
        !input.corrective_action.trim()
      ) {
        return jsonError(
          "Analisa awal, penyebab, dan tindakan perbaikan wajib diisi.",
          400
        );
      }

      const initialAnalysis =
        input.initial_analysis.trim();

      const rootCause =
        input.root_cause.trim();

      const correctiveAction =
        input.corrective_action.trim();

      if (
        initialAnalysis.length > 10000 ||
        rootCause.length > 10000 ||
        correctiveAction.length > 10000
      ) {
        return jsonError(
          "Data analisa atau tindakan perbaikan terlalu panjang.",
          400
        );
      }

      // =========================================
      // 2. VALIDASI PART
      // =========================================

      if (typeof input.part_replaced !== "boolean") {
        return jsonError(
          "Pilih apakah ada part yang diganti.",
          400
        );
      }

      const partReplaced = input.part_replaced;

      let partDescription: string | null = null;

      if (partReplaced) {
        if (
          typeof input.part_replaced_description !== "string" ||
          !input.part_replaced_description.trim()
        ) {
          return jsonError(
            "Isi nama part yang diganti.",
            400
          );
        }

        partDescription =
          input.part_replaced_description.trim();

        if (partDescription.length > 1000) {
          return jsonError(
            "Deskripsi part maksimal 1000 karakter.",
            400
          );
        }
      }

      // =========================================
      // 3. VALIDASI BIAYA KOMPONEN
      // =========================================

      const costInput = input.component_cost;

      if (
        costInput !== undefined &&
        costInput !== null &&
        costInput !== "" &&
        typeof costInput !== "number" &&
        typeof costInput !== "string"
      ) {
        return jsonError(
          "Biaya komponen tidak valid.",
          400
        );
      }

      const cost =
        costInput === "" || costInput == null
          ? 0
          : Number(costInput);

      if (
        !Number.isFinite(cost) ||
        cost < 0
      ) {
        return jsonError(
          "Biaya tidak valid.",
          400
        );
      }

      // =========================================
      // 4. VALIDASI HASIL PENANGANAN
      // =========================================

      if (
        typeof input.resolution_result !== "string" ||
        !ALLOWED_OUTCOMES.includes(
          input.resolution_result as ResolutionResult
        )
      ) {
        return jsonError(
          "Pilih hasil penanganan.",
          400
        );
      }

      const resolutionResult =
        input.resolution_result as ResolutionResult;

      // =========================================
      // 5. VALIDASI ALASAN TIDAK BISA SELESAI
      // =========================================

      let resolutionReason: string | null = null;

      if (
        resolutionResult === "Tidak bisa diselesaikan"
      ) {
        if (
          typeof input.resolution_reason !== "string" ||
          !input.resolution_reason.trim()
        ) {
          return jsonError(
            "Alasan tidak bisa diselesaikan wajib diisi.",
            400
          );
        }

        resolutionReason =
          input.resolution_reason.trim();

        if (resolutionReason.length > 1000) {
          return jsonError(
            "Alasan maksimal 1000 karakter.",
            400
          );
        }
      }

      // =========================================
      // 6. VALIDASI BUKTI PENYELESAIAN
      // =========================================

      const proof = input.proof;

      let proofData: {
        base64: string;
        name: string;
        mimeType: string;
        bytes: Buffer;
      } | null = null;

      if (
        proof !== undefined &&
        proof !== null
      ) {
        if (
          typeof proof !== "object" ||
          Array.isArray(proof)
        ) {
          return jsonError(
            "Format bukti penyelesaian tidak valid.",
            400
          );
        }

        const data = proof as Record<string, unknown>;

        if (
          typeof data.base64 !== "string" ||
          typeof data.mimeType !== "string" ||
          !ALLOWED_PHOTO_TYPES.includes(
            data.mimeType as
              (typeof ALLOWED_PHOTO_TYPES)[number]
          )
        ) {
          return jsonError(
            "Bukti gambar tidak valid.",
            400
          );
        }

        if (
          !isValidBase64(data.base64)
        ) {
          return jsonError(
            "Format data gambar tidak valid atau terlalu besar.",
            400
          );
        }

        const proofBytes = Buffer.from(
          data.base64,
          "base64"
        );

        // Pastikan base64 benar-benar valid dan canonical.
        if (
          proofBytes.toString("base64") !== data.base64
        ) {
          return jsonError(
            "Format data gambar tidak valid.",
            400
          );
        }

        if (
          proofBytes.length === 0 ||
          proofBytes.length > MAX_PHOTO_SIZE
        ) {
          return jsonError(
            "Ukuran bukti maksimal 4 MB.",
            400
          );
        }

        if (
          !isValidPhoto(
            proofBytes,
            data.mimeType
          )
        ) {
          return jsonError(
            "Isi file bukti tidak valid.",
            400
          );
        }

        const originalName =
          typeof data.name === "string"
            ? data.name
            : "bukti-penyelesaian";

        proofData = {
          base64: data.base64,
          name: sanitizeFileName(
            originalName,
            "bukti-penyelesaian"
          ),
          mimeType: data.mimeType,
          bytes: proofBytes,
        };
      }

      // =========================================
      // 7. TENTUKAN STATUS BERDASARKAN HASIL
      // =========================================

      let nextStatus: string;

      if (resolutionResult === "Selesai") {
        nextStatus = "Selesai";
      } else if (
        resolutionResult === "Tidak bisa diselesaikan"
      ) {
        nextStatus = "Tidak bisa diselesaikan";
      } else {
        nextStatus = "Sedang dikerjakan";
      }

      const isClosed =
        nextStatus === "Selesai" ||
        nextStatus === "Tidak bisa diselesaikan";

      // =========================================
      // 8. TRANSAKSI WORKLOG DAN LAMPIRAN
      // =========================================

      let connection:
        | Awaited<ReturnType<typeof pool.getConnection>>
        | undefined;

      let transactionStarted = false;

      try {
        connection = await pool.getConnection();

        await connection.beginTransaction();
        transactionStarted = true;

        // -----------------------------------------
        // Kunci dan validasi tiket
        // -----------------------------------------

        const [ticketRows] = await connection.execute(
          `
            SELECT id, status
            FROM tickets
            WHERE ticket_number = ?
            LIMIT 1
            FOR UPDATE
          `,
          [ticketNumber]
        );

        const currentTickets = ticketRows as Array<{
          id: number;
          status: string;
        }>;

        if (currentTickets.length === 0) {
          await connection.rollback();
          transactionStarted = false;

          return jsonError(
            "Tiket tidak ditemukan.",
            404
          );
        }

        const currentTicket = currentTickets[0];

        // Worklog hanya dapat disimpan pada tiket
        // yang sudah disetujui dan sedang dikerjakan.
        if (
          currentTicket.status !== "Sedang dikerjakan"
        ) {
          await connection.rollback();
          transactionStarted = false;

          return jsonError(
            "Worklog hanya dapat disimpan pada tiket yang sedang dikerjakan.",
            409
          );
        }

        // -----------------------------------------
        // Periksa bukti lama jika hasil Selesai
        // -----------------------------------------

        if (
          resolutionResult === "Selesai" &&
          !proofData
        ) {
          const [existingProof] =
            await connection.execute(
              `
                SELECT id
                FROM ticket_attachments
                WHERE ticket_id = ?
                  AND category = 'proof'
                LIMIT 1
              `,
              [currentTicket.id]
            );

          if (!(existingProof as unknown[]).length) {
            await connection.rollback();
            transactionStarted = false;

            return jsonError(
              "Unggah bukti penyelesaian sebelum menandai tiket selesai.",
              400
            );
          }
        }

        // -----------------------------------------
        // Simpan bukti baru jika tersedia
        // -----------------------------------------

        if (proofData) {
          const extension =
            proofData.mimeType === "image/jpeg"
              ? ".jpg"
              : proofData.mimeType === "image/png"
                ? ".png"
                : ".webp";

          await connection.execute(
            `
              INSERT INTO ticket_attachments (
                ticket_id,
                uploaded_by,
                file_name,
                storage_key,
                mime_type,
                file_size,
                file_data,
                category
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, 'proof')
            `,
            [
              currentTicket.id,
              session.id,
              proofData.name,
              `proof-${randomUUID()}${extension}`,
              proofData.mimeType,
              proofData.bytes.length,
              proofData.bytes,
            ]
          );
        }

        // -----------------------------------------
        // Update worklog dan status tiket
        // -----------------------------------------

        const [updateResult] =
          await connection.execute(
            `
              UPDATE tickets
              SET
                initial_analysis = ?,
                root_cause = ?,
                corrective_action = ?,
                part_replaced = ?,
                part_replaced_description = ?,
                component_cost = ?,
                resolution_result = ?,
                resolution_reason = ?,
                status = ?,
                completed_at = IF(
                  ? = 1,
                  CURRENT_TIMESTAMP,
                  NULL
                ),
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
                AND status = 'Sedang dikerjakan'
            `,
            [
              initialAnalysis,
              rootCause,
              correctiveAction,
              partReplaced ? 1 : 0,
              partDescription,
              cost,
              resolutionResult,
              resolutionReason,
              nextStatus,
              isClosed ? 1 : 0,
              currentTicket.id,
            ]
          );

        const affectedRows = (
          updateResult as { affectedRows: number }
        ).affectedRows;

        if (affectedRows !== 1) {
          await connection.rollback();
          transactionStarted = false;

          return jsonError(
            "Tiket berubah atau gagal diperbarui. Silakan muat ulang data.",
            409
          );
        }

        // -----------------------------------------
        // Commit transaksi
        // -----------------------------------------

        await connection.commit();
        transactionStarted = false;

        return NextResponse.json({
          success: true,
          message: "Catatan penanganan berhasil disimpan.",
          data: {
            status: nextStatus,
            resolution_result: resolutionResult,
            resolution_reason: resolutionReason,
            is_closed: isClosed,
          },
        });
      } catch (error) {
        if (connection && transactionStarted) {
          try {
            await connection.rollback();
          } catch (rollbackError) {
            console.error(
              "Worklog rollback failed:",
              rollbackError
            );
          }
        }

        throw error;
      } finally {
        connection?.release();
      }
    }

    // =============================================
    // ACTION: UPDATE STATUS
    // HANYA BOLEH MEMULAI PENGERJAAN
    // =============================================

    if (action === "update_status") {
      if (status !== "Sedang dikerjakan") {
        return jsonError(
          "Status Selesai dan Tidak bisa diselesaikan hanya dapat ditetapkan melalui penyimpanan worklog.",
          400
        );
      }

      const [result] = await pool.execute(
        `
          UPDATE tickets
          SET
            status = 'Sedang dikerjakan',
            updated_at = CURRENT_TIMESTAMP
          WHERE ticket_number = ?
            AND status = 'Belum dikerjakan'
        `,
        [ticketNumber]
      );

      const affectedRows = (
        result as { affectedRows: number }
      ).affectedRows;

      if (affectedRows === 1) {
        return NextResponse.json({
          success: true,
          message: "Tiket berhasil dipindahkan ke status Sedang dikerjakan.",
        });
      }

      // Periksa keadaan tiket jika update tidak terjadi.
      const [currentRows] = await pool.execute(
        `
          SELECT status
          FROM tickets
          WHERE ticket_number = ?
          LIMIT 1
        `,
        [ticketNumber]
      );

      const currentTickets = currentRows as Array<{
        status: string;
      }>;

      if (currentTickets.length === 0) {
        return jsonError(
          "Tiket tidak ditemukan.",
          404
        );
      }

      if (
        currentTickets[0].status === "Sedang dikerjakan"
      ) {
        return NextResponse.json({
          success: true,
          message: "Tiket sudah berstatus Sedang dikerjakan.",
        });
      }

      return jsonError(
        "Perubahan status tiket tidak diperbolehkan.",
        409
      );
    }

    // =============================================
    // ACTION TIDAK DIKENALI
    // =============================================

    return jsonError(
      "Action tidak dikenali.",
      400
    );
  } catch (error) {
    console.error("PATCH tickets error:", error);

    return jsonError(
      "Gagal memperbarui tiket.",
      500
    );
  }
}
