import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const ALLOWED_CONFIRMATIONS = [
  "Belum Selesai",
  "Sudah Selesai",
] as const;

type Confirmation = (typeof ALLOWED_CONFIRMATIONS)[number];

type JsonBody = {
  action?: unknown;
  ticket_number?: unknown;
  phone?: unknown;
  confirmation?: unknown;
  reason?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.startsWith("62") ? `0${digits.slice(2)}` : digits;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidTicketNumber(value: string): boolean {
  return value.length > 0 && value.length <= 30;
}

async function getVerifiedTicket(ticketNumber: string, phone: string) {
  const [rows] = await pool.execute(
    `
      SELECT
        t.id,
        t.ticket_number,
        t.reporter_name,
        t.reporter_phone,
        t.division,
        t.location,
        t.device,
        t.issue,
        t.impact,
        t.priority,
        t.status,
        t.resolution_completed_reason,
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(t.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
        DATE_FORMAT(COALESCE(t.completed_at, t.updated_at), '%Y-%m-%d %H:%i:%s') AS completed_at,
        p.name AS assigned_pic_name
      FROM tickets t
      LEFT JOIN ticket_pics p
        ON p.id = t.assigned_pic_id
      WHERE t.ticket_number = ?
      LIMIT 1
    `,
    [ticketNumber]
  );

  const ticket = (rows as Array<{
    id: number | string;
    ticket_number: string;
    reporter_name: string | null;
    reporter_phone: string | null;
    division: string | null;
    location: string | null;
    device: string | null;
    issue: string | null;
    impact: string | null;
    priority: string | null;
    status: string;
    resolution_completed_reason: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    assigned_pic_name: string | null;
  }>)[0];

  // Gunakan pesan yang sama untuk nomor tiket tidak ditemukan dan nomor telepon salah.
  if (
    !ticket ||
    normalizePhone(ticket.reporter_phone) !== normalizePhone(phone)
  ) {
    return null;
  }

  const [feedbackRows] = await pool.execute(
    `
      SELECT
        confirmation,
        reason,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM ticket_customer_feedback
      WHERE ticket_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [ticket.id]
  );

  const latestFeedback =
    (feedbackRows as Array<{
      confirmation: string;
      reason: string | null;
      created_at: string;
    }>)[0] ?? null;

  const completedAt = String(ticket.completed_at ?? "");
  const feedbackAt = String(latestFeedback?.created_at ?? "");
  const confirmationSubmittedForCurrentCompletion =
    String(ticket.status) === "Selesai" &&
    Boolean(latestFeedback) &&
    Boolean(completedAt) &&
    feedbackAt >= completedAt;

  return {
    ticket: {
      ticket_number: String(ticket.ticket_number),
      reporter_name: String(ticket.reporter_name ?? ""),
      division: String(ticket.division ?? ""),
      location: String(ticket.location ?? ""),
      device: String(ticket.device ?? ""),
      issue: String(ticket.issue ?? ""),
      impact: String(ticket.impact ?? ""),
      priority: ticket.priority ? String(ticket.priority) : null,
      status: String(ticket.status ?? ""),
      resolution_completed_reason: String(
        ticket.resolution_completed_reason ?? ""
      ),
      assigned_pic_name: ticket.assigned_pic_name
        ? String(ticket.assigned_pic_name)
        : null,
      created_at: String(ticket.created_at ?? ""),
      updated_at: String(ticket.updated_at ?? ""),
      completed_at: completedAt || null,
    },
    latest_feedback: latestFeedback
      ? {
          confirmation: String(latestFeedback.confirmation ?? ""),
          reason: String(latestFeedback.reason ?? ""),
          created_at: feedbackAt,
        }
      : null,
    confirmation_submitted_for_current_completion:
      confirmationSubmittedForCurrentCompletion,
  };
}

export async function POST(request: NextRequest) {
  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return jsonError("Format permintaan tidak valid.", 400);
  }

  if (
    !parsedBody ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    return jsonError("Format permintaan tidak valid.", 400);
  }

  const body = parsedBody as JsonBody;
  const action = getString(body.action);
  const ticketNumber = getString(body.ticket_number).toUpperCase();
  const phone = getString(body.phone);
  const phoneDigits = normalizePhone(phone);

  if (!isValidTicketNumber(ticketNumber)) {
    return jsonError("Nomor tiket wajib diisi dengan benar.", 400);
  }

  if (
    phone.length > 30 ||
    phoneDigits.length < 9 ||
    phoneDigits.length > 15
  ) {
    return jsonError("Nomor WhatsApp tidak valid.", 400);
  }

  if (action === "lookup") {
    try {
      const data = await getVerifiedTicket(ticketNumber, phone);

      if (!data) {
        return jsonError(
          "Tiket tidak ditemukan atau nomor WhatsApp tidak sesuai.",
          404
        );
      }

      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      console.error("POST ticket tracking lookup error:", error);
      return jsonError("Gagal mengambil status tiket.", 500);
    }
  }

  if (action !== "submit_confirmation") {
    return jsonError("Action tidak dikenali.", 400);
  }

  const confirmation = body.confirmation;
  if (
    typeof confirmation !== "string" ||
    !ALLOWED_CONFIRMATIONS.includes(confirmation as Confirmation)
  ) {
    return jsonError("Pilihan konfirmasi tidak valid.", 400);
  }

  const reason = getString(body.reason);
  if (confirmation === "Belum Selesai") {
    if (reason.length < 5 || reason.length > 2000) {
      return jsonError(
        "Alasan belum selesai wajib diisi (5–2000 karakter).",
        400
      );
    }
  }

  let connection:
    | Awaited<ReturnType<typeof pool.getConnection>>
    | undefined;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [ticketRows] = await connection.execute(
      `
        SELECT
          id,
          reporter_phone,
          status,
          DATE_FORMAT(COALESCE(completed_at, updated_at), '%Y-%m-%d %H:%i:%s') AS completed_at
        FROM tickets
        WHERE ticket_number = ?
        LIMIT 1
        FOR UPDATE
      `,
      [ticketNumber]
    );

    const ticket = (ticketRows as Array<{
      id: number | string;
      reporter_phone: string | null;
      status: string;
      completed_at: string | null;
    }>)[0];

    if (
      !ticket ||
      normalizePhone(ticket.reporter_phone) !== phoneDigits
    ) {
      await connection.rollback();
      transactionStarted = false;
      return jsonError(
        "Tiket tidak ditemukan atau nomor WhatsApp tidak sesuai.",
        404
      );
    }

    if (String(ticket.status) !== "Selesai" || !ticket.completed_at) {
      await connection.rollback();
      transactionStarted = false;
      return jsonError(
        "Validasi pengguna hanya tersedia ketika tiket berstatus Selesai.",
        409
      );
    }

    const [existingRows] = await connection.execute(
      `
        SELECT id
        FROM ticket_customer_feedback
        WHERE ticket_id = ?
          AND created_at >= ?
        LIMIT 1
      `,
      [ticket.id, ticket.completed_at]
    );

    if ((existingRows as unknown[]).length > 0) {
      await connection.rollback();
      transactionStarted = false;
      return jsonError(
        "Anda sudah mengirim validasi untuk penyelesaian tiket ini.",
        409
      );
    }

    await connection.execute(
      `
        INSERT INTO ticket_customer_feedback (
          ticket_id,
          confirmation,
          reason
        )
        VALUES (?, ?, ?)
      `,
      [
        ticket.id,
        confirmation,
        confirmation === "Belum Selesai" ? reason : null,
      ]
    );

    if (confirmation === "Belum Selesai") {
      await connection.execute(
        `
          UPDATE tickets
          SET
            status = 'Belum dikerjakan',
            completed_at = NULL,
            resolution_result = NULL,
            resolution_reason = NULL,
            resolution_completed_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND status = 'Selesai'
        `,
        [ticket.id]
      );

      await connection.execute(
        `
          INSERT INTO ticket_status_history (
            ticket_id,
            old_status,
            new_status,
            admin_user_id,
            note
          )
          VALUES (?, 'Selesai', 'Belum dikerjakan', NULL, ?)
        `,
        [
          ticket.id,
          `Pengguna menyatakan masalah belum selesai: ${reason}`,
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,
        message:
          confirmation === "Belum Selesai"
            ? "Laporan diterima. Tiket dibuka kembali untuk ditangani tim IT."
            : "Terima kasih. Konfirmasi penyelesaian tiket berhasil disimpan.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Ticket feedback rollback error:", rollbackError);
      }
    }

    console.error("POST ticket tracking confirmation error:", error);
    return jsonError("Gagal menyimpan konfirmasi tiket.", 500);
  } finally {
    connection?.release();
  }
}
