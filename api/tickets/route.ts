import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import pool from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function getText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidPhoto(bytes: Buffer, mimeType: string): boolean {
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
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
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

// =====================================================
// GET: ADMIN - MENGAMBIL DATA TIKET
// =====================================================

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
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
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(t.completed_at, '%Y-%m-%d %H:%i:%s') AS completed_at,
        DATE_FORMAT(t.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
        t.device_type, t.previous_occurrence, t.impact,
        t.initial_analysis, t.root_cause, t.corrective_action,
        t.part_replaced, t.part_replaced_description, t.component_cost,
        t.resolution_result, t.assigned_pic_id, p.name AS assigned_pic_name,
        (SELECT a.id FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='issue_photo' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS photo_attachment_id,
        (SELECT a.file_name FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='issue_photo' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS photo_file_name,
        (SELECT a.mime_type FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='issue_photo' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS photo_mime_type,
        (SELECT a.file_size FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='issue_photo' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS photo_file_size,
        (SELECT a.id FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='proof' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS proof_attachment_id,
        (SELECT a.file_name FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='proof' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS proof_file_name,
        (SELECT a.mime_type FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='proof' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS proof_mime_type,
        (SELECT a.file_size FROM ticket_attachments a WHERE a.ticket_id=t.id AND a.category='proof' ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS proof_file_size
      FROM tickets t LEFT JOIN ticket_pics p ON p.id=t.assigned_pic_id
      ORDER BY t.created_at DESC
      `,
    );

    // Ambil seluruh metadata lampiran untuk tiket selesai, bukan hanya file terbaru.
    // Isi binary (file_data) tidak dikirim ke browser; file tetap berada di database.
    const [attachmentRows] = await pool.execute(
      `
        SELECT
          a.ticket_id,
          a.id,
          a.category,
          a.file_name,
          a.mime_type,
          a.file_size,
          DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM ticket_attachments a
        INNER JOIN tickets t ON t.id = a.ticket_id
        WHERE t.status = 'Selesai'
        ORDER BY a.ticket_id ASC, a.created_at ASC, a.id ASC
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

    for (const attachment of attachmentRows as Array<Record<string, unknown>>) {
      const ticketKey = String(attachment.ticket_id);
      const items = attachmentsByTicket.get(ticketKey) ?? [];
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

    const tickets = (rows as Array<Record<string, unknown>>).map(
      (row) => ({
        database_id: String(row.database_id),
        id: String(row.ticket_number),
        ticket_number: String(row.ticket_number),
        name: String(row.reporter_name),
        reporter_name: String(row.reporter_name),
        email: row.reporter_email ? String(row.reporter_email) : "",
        reporter_email: row.reporter_email ? String(row.reporter_email) : "",
        reporter_phone: row.reporter_phone ? String(row.reporter_phone) : "",
        division: String(row.division),
        location: String(row.location),
        device: String(row.device),
        device_type: String(row.device_type ?? ""),
        issue: String(row.issue),
        impact: String(row.impact ?? ""),
        previous_occurrence: String(row.previous_occurrence ?? ""),
        priority:
          row.priority === "Safe"
            ? "Rendah"
            : row.priority === "Urgent"
              ? "Tinggi"
              : row.priority as "Rendah" | "Medium" | "Tinggi" | null,
        status: String(row.status ?? "").trim(),
        time: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        completed_at: row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at ? String(row.completed_at) : null,
        updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ""),
        assigned_pic_id: row.assigned_pic_id == null ? null : String(row.assigned_pic_id),
        assigned_pic_name: row.assigned_pic_name ? String(row.assigned_pic_name) : null,
        initial_analysis: String(row.initial_analysis ?? ""),
        root_cause: String(row.root_cause ?? ""),
        corrective_action: String(row.corrective_action ?? ""),
        part_replaced: Boolean(row.part_replaced),
        part_replaced_description: String(row.part_replaced_description ?? ""),
        component_cost: row.component_cost == null ? null : Number(row.component_cost),
        resolution_result: String(row.resolution_result ?? ""),
        photoAttachmentId: row.photo_attachment_id == null ? null : String(row.photo_attachment_id),
        photoFileName: row.photo_file_name == null ? "" : String(row.photo_file_name),
        photoMimeType: row.photo_mime_type == null ? "" : String(row.photo_mime_type),
        photoFileSize: row.photo_file_size == null ? null : Number(row.photo_file_size),
        proofAttachmentId: row.proof_attachment_id == null ? null : String(row.proof_attachment_id),
        proofFileName: row.proof_file_name == null ? "" : String(row.proof_file_name),
        proofMimeType: row.proof_mime_type == null ? "" : String(row.proof_mime_type),
        proofFileSize: row.proof_file_size == null ? null : Number(row.proof_file_size),
        attachments: attachmentsByTicket.get(String(row.database_id)) ?? [],
      }),
    );

    return NextResponse.json({ success: true, tickets }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("GET tickets error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data tiket." }, { status: 500 });
  }
}

// =====================================================
// POST: PUBLIK - MEMBUAT TIKET DAN MENYIMPAN FOTO KE DB
// =====================================================


export async function POST(request: NextRequest) {
  let formData: FormData;

  // Membaca formulir
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

  // Mengambil data formulir
  const reporter_name = getText(formData, "reporter_name");
  const reporter_email = getText(formData, "reporter_email") || null;
  const reporter_phone = getText(formData, "reporter_phone");
  const division = getText(formData, "division");
  const location = getText(formData, "location");
  const device = getText(formData, "device");
  const device_type = getText(formData, "device_type");
  const previous_occurrence = getText(formData, "previous_occurrence");
  const issue = getText(formData, "issue");
  const impact = getText(formData, "impact");
  const confirmed = getText(formData, "confirmed");
  const photoValue = formData.get("photo");
    // Foto wajib diunggah
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

  // Validasi field wajib
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
        message: "Semua field wajib diisi dan laporan harus dikonfirmasi.",
      },
      { status: 400 }
    );
  }

  // Validasi nomor telepon / WhatsApp di sisi server.
  const phoneDigits = reporter_phone.replace(/\D/g, "");
  if (
    reporter_phone.length > 30 ||
    !/^\+?[0-9][0-9\s().-]*$/.test(reporter_phone) ||
    phoneDigits.length < 9 ||
    phoneDigits.length > 15
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Nomor telepon / WhatsApp tidak valid. Gunakan 9–15 digit.",
      },
      { status: 400 }
    );
  }

  // Validasi pilihan riwayat kendala
  const allowedPreviousValues = ["Pernah", "Belum", "Tidak Tahu"];

  if (!allowedPreviousValues.includes(previous_occurrence)) {
    return NextResponse.json(
      {
        success: false,
        message: "Pilihan riwayat kendala tidak valid.",
      },
      { status: 400 }
    );
  }

  // Validasi panjang karakter
  if (
    reporter_name.length > 150 ||
    (reporter_email && reporter_email.length > 190) ||
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

  // Persiapan foto
  let photoName: string | null = null;
  let photoMimeType: string | null = null;
  let photoBytes: Buffer | null = null;

  if (photoValue !== null) {
    if (!(photoValue instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format lampiran tidak valid.",
        },
        { status: 400 }
      );
    }

    if (photoValue.size > 0) {
      if (photoValue.size > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: "Ukuran foto maksimal 4 MB.",
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_PHOTO_TYPES.includes(photoValue.type)) {
        return NextResponse.json(
          {
            success: false,
            message: "Foto harus berformat JPG, PNG, atau WEBP.",
          },
          { status: 400 }
        );
      }

      photoBytes = Buffer.from(await photoValue.arrayBuffer());

      if (!isValidPhoto(photoBytes, photoValue.type)) {
        return NextResponse.json(
          {
            success: false,
            message: "Isi file foto tidak valid.",
          },
          { status: 400 }
        );
      }

      photoName =
        photoValue.name.split(/[\\/]/).pop()?.slice(0, 255) ||
        "lampiran";

      photoMimeType = photoValue.type;
    }
  }

  // Membuat nomor tiket
  const ticketNumber = `WG-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  let connection:
    | Awaited<ReturnType<typeof pool.getConnection>>
    | undefined;

  let transactionStarted = false;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // Menyimpan data tiket
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
      ticketResult as { insertId: number | bigint }
    ).insertId;

    // Menyimpan foto jika tersedia
    if (photoBytes && photoName && photoMimeType) {
      const extension =
        photoMimeType === "image/jpeg"
          ? ".jpg"
          : photoMimeType === "image/png"
            ? ".png"
            : ".webp";

      const storageKey = `ticket-${randomUUID()}${extension}`;

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

    // Commit transaksi
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
    console.error("POST tickets - Original error:", error);

    // Rollback hanya jika transaksi sudah dimulai
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
// PATCH: ADMIN - APPROVE TIKET / UPDATE STATUS
// =====================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Format permintaan tidak valid.",
        },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Permintaan tidak valid.",
        },
        { status: 400 },
      );
    }

    const input = body as {
      ticket_number?: unknown;
      action?: unknown;
      priority?: unknown;
      status?: unknown;
      assigned_pic_id?: unknown;
      initial_analysis?: unknown; root_cause?: unknown; corrective_action?: unknown;
      part_replaced?: unknown; part_replaced_description?: unknown; component_cost?: unknown;
      resolution_result?: unknown; proof?: unknown;
    };

    const { ticket_number, action, priority, status } = input;

    if (
      typeof ticket_number !== "string" ||
      !ticket_number.trim() ||
      typeof action !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Nomor tiket dan action wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (action === "approve") {
      if (priority !== "Rendah" && priority !== "Medium" && priority !== "Tinggi") {
        return NextResponse.json(
          {
            success: false,
            error: "Prioritas tiket tidak valid.",
          },
          { status: 400 },
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
        [priority, ticket_number],
      );

      if (!(result as { affectedRows?: number }).affectedRows) {
        return NextResponse.json(
          {
            success: false,
            error: "Tiket tidak ditemukan atau sudah diproses.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Tiket berhasil disetujui.",
      });
    }


if (action === "assign_pic") {
  const picId = Number(input.assigned_pic_id);

  if (!Number.isInteger(picId) || picId <= 0) {
    return NextResponse.json(
      { success: false, error: "PIC tidak valid." },
      { status: 400 }
    );
  }

  // Pastikan tiket tersedia dan PIC belum pernah ditetapkan.
  const [ticketRows] = await pool.execute(
    `SELECT id, assigned_pic_id
     FROM tickets
     WHERE ticket_number = ?
     LIMIT 1`,
    [ticket_number]
  );

  const tickets = ticketRows as Array<{
    id: number;
    assigned_pic_id: number | null;
  }>;

  if (tickets.length === 0) {
    return NextResponse.json(
      { success: false, error: "Tiket tidak ditemukan." },
      { status: 404 }
    );
  }

  if (tickets[0].assigned_pic_id !== null) {
    return NextResponse.json(
      {
        success: false,
        error: "PIC sudah ditetapkan dan tidak dapat diubah.",
      },
      { status: 409 }
    );
  }

  // Pastikan PIC masih aktif.
  const [picRows] = await pool.execute(
    `SELECT id, name
     FROM ticket_pics
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [picId]
  );

  if (!(picRows as unknown[]).length) {
    return NextResponse.json(
      {
        success: false,
        error: "PIC tidak ditemukan atau sudah tidak aktif.",
      },
      { status: 404 }
    );
  }

  // Penguncian atomik: hanya bisa mengisi jika masih NULL.
// Tetapkan PIC hanya jika tiket belum memiliki PIC.
const [updateResult] = await pool.execute(
  `
    UPDATE tickets
    SET
      assigned_pic_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND assigned_pic_id IS NULL
  `,
  [picId, tickets[0].id]
);

// Periksa apakah penetapan berhasil.
if (!(updateResult as { affectedRows: number }).affectedRows) {
  return NextResponse.json(
    {
      success: false,
      error: "PIC sudah ditetapkan dan tidak dapat diubah.",
    },
    { status: 409 }
  );
}

// Berhasil menetapkan PIC.
return NextResponse.json({
  success: true,
  message: "PIC berhasil ditetapkan dan dikunci.",
});
}

    if (action === "save_worklog") {
      const fields = [input.initial_analysis,input.root_cause,input.corrective_action];
      if (fields.some(v => typeof v !== "string" || !v.trim())) return NextResponse.json({success:false,error:"Analisa awal, penyebab, dan tindakan perbaikan wajib diisi."},{status:400});
      if (typeof input.part_replaced !== "boolean") return NextResponse.json({success:false,error:"Pilih apakah ada part yang diganti."},{status:400});
      if (input.part_replaced && (typeof input.part_replaced_description !== "string" || !input.part_replaced_description.trim())) return NextResponse.json({success:false,error:"Isi nama part yang diganti."},{status:400});
      const cost = input.component_cost === "" || input.component_cost == null ? 0 : Number(input.component_cost);
      if (!Number.isFinite(cost) || cost < 0) return NextResponse.json({success:false,error:"Biaya tidak valid."},{status:400});
      const outcomes = ["Selesai","Belum selesai","Tidak bisa diselesaikan"];
      if (typeof input.resolution_result !== "string" || !outcomes.includes(input.resolution_result)) return NextResponse.json({success:false,error:"Pilih hasil penanganan."},{status:400});
      const proof = input.proof;
      if (input.resolution_result === "Selesai" && !proof) {
        const [existingProof] = await pool.execute("SELECT a.id FROM ticket_attachments a JOIN tickets t ON t.id=a.ticket_id WHERE t.ticket_number=? AND a.category='proof' LIMIT 1", [ticket_number]);
        if (!(existingProof as unknown[]).length) return NextResponse.json({success:false,error:"Unggah bukti penyelesaian sebelum menandai tiket selesai."},{status:400});
      }
      if (proof && typeof proof === "object" && "base64" in proof) {
        const data = proof as {base64:string;name:string;mimeType:string};
        if (!["image/jpeg","image/png","image/webp"].includes(data.mimeType) || !data.base64 || data.base64.length > 6_000_000) return NextResponse.json({success:false,error:"Bukti gambar tidak valid atau terlalu besar."},{status:400});
        const bytes = Buffer.from(data.base64,"base64");
        const [ticketRows] = await pool.execute("SELECT id FROM tickets WHERE ticket_number=?",[ticket_number]);
        const ticketId = (ticketRows as Array<{id:number}>)[0]?.id;
        if (!ticketId) return NextResponse.json({success:false,error:"Tiket tidak ditemukan."},{status:404});
        await pool.execute("INSERT INTO ticket_attachments (ticket_id,uploaded_by,file_name,storage_key,mime_type,file_size,file_data,category) VALUES (?,?,?,?,?,?,?, 'proof')",[ticketId,Number(session.id),String(data.name||"bukti-penyelesaian").slice(0,255),`proof-${randomUUID()}`,data.mimeType,bytes.length,bytes]);
      }
      const nextStatus = input.resolution_result === "Selesai" ? "Selesai" : "Sedang dikerjakan";
      await pool.execute(`UPDATE tickets SET initial_analysis=?,root_cause=?,corrective_action=?,part_replaced=?,part_replaced_description=?,component_cost=?,resolution_result=?,status=?,completed_at=IF(?='Selesai',CURRENT_TIMESTAMP,NULL),updated_at=CURRENT_TIMESTAMP WHERE ticket_number=?`,[String(input.initial_analysis).trim(),String(input.root_cause).trim(),String(input.corrective_action).trim(),input.part_replaced?1:0,input.part_replaced?String(input.part_replaced_description).trim():null,cost,input.resolution_result,nextStatus,nextStatus,ticket_number]);
      return NextResponse.json({success:true,message:"Catatan penanganan berhasil disimpan."});
    }

    if (action === "update_status") {
      if (
        status !== "Sedang dikerjakan" &&
        status !== "Selesai"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Status tiket tidak valid.",
          },
          { status: 400 },
        );
      }

      const [currentRows] = await pool.execute(
        `
        SELECT status
        FROM tickets
        WHERE ticket_number = ?
        LIMIT 1
        `,
        [ticket_number],
      );

      const currentTickets = currentRows as Array<{
        status: string;
      }>;

      if (currentTickets.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Tiket tidak ditemukan.",
          },
          { status: 404 },
        );
      }

      const currentStatus = currentTickets[0].status;

      const allowedTransitions: Record<string, string[]> = {
        "Belum dikerjakan": ["Sedang dikerjakan"],
        "Sedang dikerjakan": ["Selesai"],
      };

      if (
        !(
          allowedTransitions[currentStatus] ?? []
        ).includes(status)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Perubahan status tiket tidak diperbolehkan.",
          },
          { status: 400 },
        );
      }

      if (status === "Selesai") {
        await pool.execute(
          `
          UPDATE tickets
          SET
            status = 'Selesai',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE ticket_number = ?
          `,
          [ticket_number],
        );
      } else {
        await pool.execute(
          `
          UPDATE tickets
          SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE ticket_number = ?
          `,
          [status, ticket_number],
        );
      }

      return NextResponse.json({
        success: true,
        message: "Status tiket berhasil diperbarui.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Action tidak dikenali.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("PATCH tickets error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui tiket.",
      },
      { status: 500 },
    );
  }
}