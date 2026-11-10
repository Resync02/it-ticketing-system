
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  History,
  CheckCircle2,
  CalendarClock,
  Download,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

type TicketAttachment = {
  id: string;
  category: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

type TicketItem = {
  database_id: string;
  id: string;
  name: string;
  email: string;
  reporter_phone: string;
  division: string;
  location: string;
  device: string;
  device_type: string;
  issue: string;
  impact: string;
  previous_occurrence: string;
  priority: "Rendah" | "Medium" | "Tinggi" | null;
  status: string;
  time: string;
  updated_at: string;
  completed_at: string | null;
  assigned_pic_id: string;
  assigned_pic_name: string;
  initial_analysis: string;
  root_cause: string;
  corrective_action: string;
  part_replaced: boolean;
  part_replaced_description: string;
  component_cost: number | null;
  resolution_result: string;
  resolution_reason: string;
  photoAttachmentId: string;
  photoFileName: string;
  photoMimeType: string;
  photoFileSize: number | null;
  proofAttachmentId: string;
  proofFileName: string;
  proofMimeType: string;
  proofFileSize: number | null;
  attachments: TicketAttachment[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  // Preserve database DATETIME values as local Jakarta wall-clock time.
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return value;

  return (
    new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(date) + " WIB"
  );
}

  // Kosong = seluruh rentang tanggal.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // =============================================
  // STATE PAGINATION
  // =============================================

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

function formatCompletionDate(value: string | null | undefined) {
  if (!value) return "-";

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

// Menentukan apakah tiket ditutup karena tidak bisa diselesaikan.
// resolution_result juga digunakan sebagai fallback untuk data lama.
function isNotResolvableTicket(ticket: TicketItem) {
  return (
    ticket.status?.trim() === "Tidak bisa diselesaikan" ||
    ticket.resolution_result?.trim() === "Tidak bisa diselesaikan"
  );
}

// Menentukan apakah tiket masuk ke History.
function isClosedTicket(ticket: TicketItem) {
  return (
    ticket.status?.trim() === "Selesai" ||
    isNotResolvableTicket(ticket)
  );
}

// Menampilkan status berdasarkan hasil penanganan.
function getHistoryStatus(ticket: TicketItem) {
  return isNotResolvableTicket(ticket)
    ? "Tidak bisa diselesaikan"
    : ticket.status;
}

// Mengambil tanggal penutupan, termasuk fallback untuk tiket lama.
function getClosureDate(ticket: TicketItem) {
  return (
    ticket.completed_at ||
    (isNotResolvableTicket(ticket) ? ticket.updated_at : "") ||
    ticket.time
  );
}

export default function HistoryPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Kosong = seluruh rentang tanggal.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoaded(false);
    setLoadError("");

    try {
      const response = await fetch("/api/tickets", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Gagal mengambil data tiket."
        );
      }

      const rows = Array.isArray(result.tickets)
        ? result.tickets
        : [];

      const normalizedTickets: TicketItem[] = rows.map(
        (ticket: Record<string, unknown>) => ({
          database_id: String(ticket.database_id ?? ""),
          id: String(ticket.ticket_number ?? ticket.id ?? ""),
          name: String(ticket.reporter_name ?? ticket.name ?? ""),
          email: String(ticket.reporter_email ?? ticket.email ?? ""),
          reporter_phone: String(ticket.reporter_phone ?? ""),
          division: String(ticket.division ?? ""),
          location: String(ticket.location ?? ""),
          device: String(ticket.device ?? ""),
          device_type: String(ticket.device_type ?? ""),
          issue: String(ticket.issue ?? ""),
          impact: String(ticket.impact ?? ""),
          previous_occurrence: String(
            ticket.previous_occurrence ?? ""
          ),

          priority:
            ticket.priority === "Rendah" ||
            ticket.priority === "Medium" ||
            ticket.priority === "Tinggi"
              ? ticket.priority
              : ticket.priority === "Safe"
                ? "Rendah"
                : ticket.priority === "Urgent"
                  ? "Tinggi"
                  : null,

          status: String(ticket.status ?? ""),
          time: String(ticket.created_at ?? ticket.time ?? ""),
          updated_at: String(ticket.updated_at ?? ""),

          completed_at:
            ticket.completed_at == null
              ? null
              : String(ticket.completed_at),

          assigned_pic_id: String(ticket.assigned_pic_id ?? ""),
          assigned_pic_name: String(ticket.assigned_pic_name ?? ""),

          initial_analysis: String(ticket.initial_analysis ?? ""),
          root_cause: String(ticket.root_cause ?? ""),
          corrective_action: String(ticket.corrective_action ?? ""),

          part_replaced:
            ticket.part_replaced === true ||
            ticket.part_replaced === 1 ||
            ticket.part_replaced === "1",

          part_replaced_description: String(
            ticket.part_replaced_description ?? ""
          ),

          component_cost:
            ticket.component_cost == null
              ? null
              : Number(ticket.component_cost),

          resolution_result: String(ticket.resolution_result ?? ""),
          resolution_reason: String(ticket.resolution_reason ?? ""),

          photoAttachmentId: String(ticket.photoAttachmentId ?? ""),
          photoFileName: String(ticket.photoFileName ?? ""),
          photoMimeType: String(ticket.photoMimeType ?? ""),

          photoFileSize:
            ticket.photoFileSize == null
              ? null
              : Number(ticket.photoFileSize),

          proofAttachmentId: String(ticket.proofAttachmentId ?? ""),
          proofFileName: String(ticket.proofFileName ?? ""),
          proofMimeType: String(ticket.proofMimeType ?? ""),

          proofFileSize:
            ticket.proofFileSize == null
              ? null
              : Number(ticket.proofFileSize),

          attachments: Array.isArray(ticket.attachments)
            ? ticket.attachments.map((attachment) => {
                const item = attachment as Record<string, unknown>;

                return {
                  id: String(item.id ?? ""),
                  category: String(item.category ?? ""),
                  file_name: String(item.file_name ?? ""),
                  mime_type: String(item.mime_type ?? ""),
                  file_size: Number(item.file_size ?? 0),
                  created_at: String(item.created_at ?? ""),
                };
              })
            : [],
        })
      );

      setTickets(normalizedTickets);
      setCurrentPage(1);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memuat tiket."
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // State changes are intentionally initiated by the initial data request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTickets();
  }, [fetchTickets]);

  // Semua tiket yang sudah ditutup:
  // 1. Selesai
  // 2. Tidak bisa diselesaikan
  const allCompletedTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (!isClosedTicket(ticket)) return false;

      const completionValue = getClosureDate(ticket);

      if (!completionValue) return false;

      const completedDate = completionValue.slice(0, 10);

      if (startDate && completedDate < startDate) return false;
      if (endDate && completedDate > endDate) return false;

      return true;
    });
  }, [tickets, startDate, endDate]);

  // Statistik tiket ditutup tanpa mengikuti filter pencarian atau tanggal.
  const totalClosedTickets = useMemo(() => {
    return tickets.filter(isClosedTicket).length;
  }, [tickets]);

  const totalResolvedTickets = useMemo(() => {
    return tickets.filter(
      (ticket) => getHistoryStatus(ticket) === "Selesai"
    ).length;
  }, [tickets]);

  const totalNotResolvableTickets = useMemo(() => {
    return tickets.filter(isNotResolvableTicket).length;
  }, [tickets]);

  // Filter pencarian hanya memengaruhi daftar di layar.
  const completedTickets = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return allCompletedTickets;

    return allCompletedTickets.filter((ticket) => {
      const searchableText = [
        ticket.id,
        ticket.name,
        ticket.email,
        ticket.reporter_phone,
        ticket.division,
        ticket.location,
        ticket.device,
        ticket.device_type,
        ticket.issue,
        ticket.impact,
        ticket.assigned_pic_name,
        ticket.resolution_result,
        ticket.resolution_reason,
        getHistoryStatus(ticket),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [allCompletedTickets, search]);

  // =============================================
  // PAGINATION
  // =============================================

  const totalPages = Math.max(
    1,
    Math.ceil(completedTickets.length / pageSize)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;

  // Data yang ditampilkan pada halaman aktif.
  const paginatedTickets = completedTickets.slice(
    startIndex,
    startIndex + pageSize
  );

  // Informasi jumlah data.
  const startItem =
    completedTickets.length === 0 ? 0 : startIndex + 1;

  const endItem = Math.min(
    startIndex + pageSize,
    completedTickets.length
  );

  async function exportExcel() {
    if (startDate && endDate && endDate < startDate) {
      setExportError(
        "Tanggal akhir tidak boleh lebih awal dari tanggal mulai."
      );
      return;
    }

    if (allCompletedTickets.length === 0) return;

    setIsExporting(true);
    setExportError("");

    try {
      // =============================================
      // SHEET 1: DATA TIKET DITUTUP
      // =============================================

      const data = allCompletedTickets.map((ticket) => ({
        "ID Database": ticket.database_id || "-",
        "Nomor Tiket": ticket.id,
        "Nama Pelapor": ticket.name,
        "Nomor Telepon / WhatsApp": ticket.reporter_phone || "-",
        "Divisi": ticket.division,
        "Lokasi": ticket.location,
        "Perangkat": ticket.device,
        "Tipe Perangkat / Identitas": ticket.device_type || "-",
        "Pernah Terjadi Sebelumnya":
          ticket.previous_occurrence || "-",
        "Deskripsi Masalah": ticket.issue,
        "Kendala dan Dampak": ticket.impact || "-",
        "Prioritas": ticket.priority ?? "Belum ditentukan",
        "Status": getHistoryStatus(ticket),
        "ID PIC": ticket.assigned_pic_id || "-",
        "Nama PIC": ticket.assigned_pic_name || "Belum ditetapkan",
        "Tanggal Pengajuan": formatDateTime(ticket.time),
        "Tanggal Ditutup": formatDateTime(getClosureDate(ticket)),
        "Tanggal Update Terakhir": formatDateTime(ticket.updated_at),
        "Analisa Awal": ticket.initial_analysis || "-",
        "Penyebab Masalah": ticket.root_cause || "-",
        "Tindakan Perbaikan": ticket.corrective_action || "-",
        "Part Diganti": ticket.part_replaced ? "Ya" : "Tidak",
        "Deskripsi Part": ticket.part_replaced
          ? ticket.part_replaced_description || "-"
          : "-",
        "Biaya (Rp)": ticket.component_cost ?? 0,
        "Hasil Penanganan": ticket.resolution_result || "-",
        "Alasan Tidak Bisa Diselesaikan":
          ticket.resolution_reason || "-",
        "ID Foto Kendala": ticket.photoAttachmentId || "-",
        "Nama File Foto Kendala": ticket.photoFileName || "-",
        "Format Foto Kendala": ticket.photoMimeType || "-",
        "Ukuran Foto Kendala (Byte)": ticket.photoFileSize ?? "-",
        "ID Bukti Penyelesaian": ticket.proofAttachmentId || "-",
        "Nama File Bukti Penyelesaian": ticket.proofFileName || "-",
        "Format Bukti Penyelesaian": ticket.proofMimeType || "-",
        "Ukuran Bukti Penyelesaian (Byte)": ticket.proofFileSize ?? "-",
        "Jumlah Seluruh Lampiran": ticket.attachments.length,
        "Daftar Nama Seluruh Lampiran":
          ticket.attachments
            .map(
              (attachment) =>
                `${attachment.category}: ${attachment.file_name}`
            )
            .join(" | ") || "-",
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      worksheet["!cols"] = [
        { wch: 14 }, // ID Database
        { wch: 20 }, // Nomor Tiket
        { wch: 24 }, // Nama Pelapor
        { wch: 24 }, // Telepon
        { wch: 22 }, // Divisi
        { wch: 16 }, // Lokasi
        { wch: 22 }, // Perangkat
        { wch: 34 }, // Tipe Perangkat
        { wch: 24 }, // Riwayat
        { wch: 48 }, // Deskripsi
        { wch: 48 }, // Dampak
        { wch: 16 }, // Prioritas
        { wch: 28 }, // Status
        { wch: 12 }, // ID PIC
        { wch: 24 }, // Nama PIC
        { wch: 24 }, // Pengajuan
        { wch: 24 }, // Penutupan
        { wch: 24 }, // Update
        { wch: 44 }, // Analisa
        { wch: 44 }, // Penyebab
        { wch: 48 }, // Tindakan
        { wch: 14 }, // Part
        { wch: 32 }, // Deskripsi part
        { wch: 18 }, // Biaya
        { wch: 28 }, // Hasil
        { wch: 48 }, // Alasan
        { wch: 20 }, // ID Foto
        { wch: 32 }, // Nama Foto
        { wch: 22 }, // Format Foto
        { wch: 20 }, // Ukuran Foto
        { wch: 24 }, // ID Bukti
        { wch: 32 }, // Nama Bukti
        { wch: 22 }, // Format Bukti
        { wch: 24 }, // Ukuran Bukti
        { wch: 14 }, // Jumlah lampiran
        { wch: 58 }, // Daftar lampiran
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Data Tiket Ditutup"
      );

      // =============================================
      // SHEET 2: PENANGANAN ADMIN
      // =============================================

      const adminHandlingData = allCompletedTickets.map((ticket) => ({
        "Nomor Tiket": ticket.id,
        "ID PIC": ticket.assigned_pic_id || "-",
        "Nama PIC": ticket.assigned_pic_name || "Belum ditetapkan",
        "Analisa Awal": ticket.initial_analysis || "-",
        "Penyebab Masalah": ticket.root_cause || "-",
        "Tindakan Perbaikan": ticket.corrective_action || "-",
        "Part Diganti": ticket.part_replaced ? "Ya" : "Tidak",
        "Deskripsi Part Diganti": ticket.part_replaced
          ? ticket.part_replaced_description || "-"
          : "-",
        "Biaya (Rp)": ticket.component_cost ?? 0,
        "Hasil Penanganan": ticket.resolution_result || "-",
        "Alasan Tidak Bisa Diselesaikan":
          ticket.resolution_reason || "-",
        "Tanggal Ditutup": formatDateTime(getClosureDate(ticket)),
        "ID Bukti Penyelesaian": ticket.proofAttachmentId || "-",
        "Nama File Bukti": ticket.proofFileName || "-",
        "Format Bukti": ticket.proofMimeType || "-",
        "Ukuran Bukti (Byte)": ticket.proofFileSize ?? "-",
        "Endpoint Bukti": ticket.proofAttachmentId
          ? `/api/tickets/attachments/${ticket.proofAttachmentId}`
          : "-",
      }));

      const adminHandlingSheet =
        XLSX.utils.json_to_sheet(adminHandlingData);

      adminHandlingSheet["!cols"] = [
        { wch: 20 },
        { wch: 12 },
        { wch: 24 },
        { wch: 42 },
        { wch: 42 },
        { wch: 48 },
        { wch: 14 },
        { wch: 34 },
        { wch: 18 },
        { wch: 28 },
        { wch: 48 },
        { wch: 24 },
        { wch: 22 },
        { wch: 34 },
        { wch: 22 },
        { wch: 20 },
        { wch: 58 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        adminHandlingSheet,
        "Penanganan Admin"
      );

      // =============================================
      // SHEET 3: SELURUH METADATA LAMPIRAN
      // =============================================

      const attachments = allCompletedTickets.flatMap((ticket) =>
        ticket.attachments.map((attachment) => ({
          "Nomor Tiket": ticket.id,
          "Jenis Lampiran":
            attachment.category === "proof"
              ? "Bukti Penyelesaian"
              : attachment.category === "issue_photo"
                ? "Foto Kendala"
                : attachment.category,
          "Attachment ID": attachment.id,
          "Nama File": attachment.file_name || "-",
          "MIME Type": attachment.mime_type || "-",
          "Ukuran (Byte)": attachment.file_size,
          "Waktu Upload": formatDateTime(attachment.created_at),
          "Endpoint Lampiran": `/api/tickets/attachments/${attachment.id}`,
        }))
      );

      const attachmentSheet = XLSX.utils.json_to_sheet(
        attachments.length
          ? attachments
          : [
              {
                "Nomor Tiket": "-",
                "Jenis Lampiran": "Tidak ada data lampiran",
                "Attachment ID": "-",
                "Nama File": "-",
                "MIME Type": "-",
                "Ukuran (Byte)": "-",
                "Waktu Upload": "-",
                "Endpoint Lampiran": "-",
              },
            ]
      );

      attachmentSheet["!cols"] = [
        { wch: 20 },
        { wch: 24 },
        { wch: 16 },
        { wch: 36 },
        { wch: 22 },
        { wch: 18 },
        { wch: 26 },
        { wch: 58 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        attachmentSheet,
        "Lampiran"
      );

      // =============================================
      // SHEET 4: RINGKASAN
      // =============================================

      const summary = XLSX.utils.aoa_to_sheet([
        ["IT Ticket - TICKET REPORT"],

        [
          "Cakupan ekspor",
          "Seluruh tiket berstatus Selesai atau Tidak bisa diselesaikan pada rentang tanggal yang dipilih",
        ],

        [
          "Tanggal mulai",
          startDate
            ? formatCompletionDate(startDate)
            : "Semua tanggal",
        ],

        [
          "Tanggal akhir",
          endDate
            ? formatCompletionDate(endDate)
            : "Semua tanggal",
        ],

        [
          "Total tiket ditutup diekspor",
          allCompletedTickets.length,
        ],

        [
          "Total tiket berhasil diselesaikan",
          allCompletedTickets.filter(
            (ticket) => getHistoryStatus(ticket) === "Selesai"
          ).length,
        ],

        [
          "Total tiket tidak bisa diselesaikan",
          allCompletedTickets.filter(
            isNotResolvableTicket
          ).length,
        ],

        [
          "Total tiket dengan alasan penutupan",
          allCompletedTickets.filter(
            (ticket) =>
              isNotResolvableTicket(ticket) &&
              Boolean(ticket.resolution_reason.trim())
          ).length,
        ],

        [
          "Total tiket dengan PIC",
          allCompletedTickets.filter((ticket) =>
            Boolean(ticket.assigned_pic_id)
          ).length,
        ],

        [
          "Total tiket dengan analisa admin",
          allCompletedTickets.filter((ticket) =>
            Boolean(ticket.initial_analysis.trim())
          ).length,
        ],

        [
          "Total tiket dengan penyebab masalah",
          allCompletedTickets.filter((ticket) =>
            Boolean(ticket.root_cause.trim())
          ).length,
        ],

        [
          "Total tiket dengan tindakan perbaikan",
          allCompletedTickets.filter((ticket) =>
            Boolean(ticket.corrective_action.trim())
          ).length,
        ],

        [
          "Total tiket dengan hasil penanganan",
          allCompletedTickets.filter((ticket) =>
            Boolean(ticket.resolution_result.trim())
          ).length,
        ],

        ["Total lampiran terdaftar", attachments.length],

        [
          "Filter pencarian",
          "Tidak diterapkan pada ekspor; seluruh tiket dalam periode tetap disertakan",
        ],

        [
          "Tanggal ekspor",
          formatDateTime(new Date().toISOString()),
        ],

        [
          "Catatan lampiran",
          "Seluruh metadata lampiran disertakan pada sheet Lampiran. File gambar tetap tersimpan di database dan tidak ditanam langsung ke workbook Excel.",
        ],
      ]);

      summary["!cols"] = [
        { wch: 45 },
        { wch: 110 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        summary,
        "Ringkasan"
      );

      // =============================================
      // DOWNLOAD FILE EXCEL
      // =============================================

      const startLabel = startDate || "semua-tanggal";
      const endLabel = endDate || "semua-tanggal";

      XLSX.writeFile(
        workbook,
        `IT-Tiket-Ditutup-${startLabel}-sd-${endLabel}.xlsx`
      );
    } catch (error) {
      console.error("Export Excel gagal:", error);

      setExportError(
        "Gagal membuat laporan Excel. Silakan coba lagi."
      );
    } finally {
      setIsExporting(false);
    }
  }

  // =============================================
  // TAMPILAN ERROR
  // =============================================

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[1600px] rounded-xl border border-red-200 bg-white p-6">
        <p className="font-semibold text-red-700">
          Riwayat tiket gagal dimuat
        </p>

        <p className="mt-2 text-sm text-slate-600">
          {loadError}
        </p>

        <button
          type="button"
          onClick={() => void fetchTickets()}
          className="mt-4 rounded-lg bg-[#172B4D] px-4 py-2 text-sm font-medium text-white"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  // =============================================
  // TAMPILAN LOADING
  // =============================================

  if (!loaded) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Memuat riwayat tiket dari database...
      </div>
    );
  }

  // =============================================
  // HALAMAN HISTORY
  // =============================================

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <section>
        <p className="text-sm font-medium text-blue-600">
          ARSIP OPERASIONAL
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#172B4D] sm:text-3xl">
          Ticket History
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Riwayat tiket IT Support yang telah ditutup, baik
          berhasil diselesaikan maupun tidak bisa diselesaikan.
        </p>
      </section>

      {/* STATISTIK HISTORY */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="rounded-lg bg-blue-50 p-3">
            <History className="text-blue-600" size={22} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Total tiket ditutup
            </p>

            <p className="mt-1 text-2xl font-semibold text-[#172B4D]">
              {totalClosedTickets}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="rounded-lg bg-emerald-50 p-3">
            <CheckCircle2 className="text-emerald-600" size={22} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Berhasil diselesaikan
            </p>

            <p className="mt-1 text-2xl font-semibold text-[#172B4D]">
              {totalResolvedTickets}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="rounded-lg bg-amber-50 p-3">
            <CalendarClock className="text-amber-600" size={22} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Tidak bisa diselesaikan
            </p>

            <p className="mt-1 text-2xl font-semibold text-[#172B4D]">
              {totalNotResolvableTickets}
            </p>
          </div>
        </div>
      </div>

      {/* FILTER TANGGAL DAN EXPORT */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-[#172B4D]">
              Laporan Tiket Berdasarkan Rentang Tanggal
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Kosongkan kedua tanggal untuk mengekspor seluruh
              tiket yang telah ditutup. Isi tanggal bila ingin
              membatasi periode.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <div>
            <label
              htmlFor="report-start-date"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Tanggal mulai
            </label>

            <input
              id="report-start-date"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="report-end-date"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Tanggal akhir
            </label>

            <input
              id="report-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => void fetchTickets()}
            disabled={!loaded}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Tarik Data
          </button>

          <button
            type="button"
            onClick={() => void exportExcel()}
            disabled={
              allCompletedTickets.length === 0 ||
              isExporting ||
              Boolean(startDate && endDate && endDate < startDate)
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            <Download size={16} />
            {isExporting ? "Memproses..." : "Export Excel"}
          </button>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <strong>
            {allCompletedTickets.length} tiket ditutup
          </strong>{" "}
          akan diekspor
          {startDate || endDate ? (
            <>
              {" "}pada periode{" "}
              <strong>
                {startDate
                  ? formatCompletionDate(startDate)
                  : "awal data"}
              </strong>
              {" "}sampai{" "}
              <strong>
                {endDate
                  ? formatCompletionDate(endDate)
                  : "tanggal terbaru"}
              </strong>.
            </>
          ) : (
            <> dari seluruh tanggal.</>
          )}
          {" "}Filter pencarian hanya memengaruhi daftar di layar,
          bukan file Excel.
        </div>

        {exportError && (
          <p role="alert" className="text-sm text-red-600">
            {exportError}
          </p>
        )}

        {startDate && endDate && endDate < startDate && (
          <p role="alert" className="text-sm text-red-600">
            Tanggal akhir tidak boleh lebih awal dari tanggal mulai.
          </p>
        )}
      </section>

      {/* DAFTAR TIKET DITUTUP */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-2">
            <History size={19} className="text-[#172B4D]" />

            <h3 className="font-semibold text-[#172B4D]">
              Tiket Ditutup
            </h3>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari ID, pelapor, divisi, masalah..."
              aria-label="Cari riwayat tiket"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

{/* TABEL HISTORY */}
<div className="overflow-x-auto">
  <table className="w-full min-w-[900px] text-left text-sm">
    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
      <tr>
        <th className="w-14 px-4 py-3.5 text-center font-medium">
          No.
        </th>

        <th className="px-5 py-3.5 font-medium">
          ID Tiket
        </th>

        <th className="px-4 py-3.5 font-medium">
          Pelapor
        </th>

        <th className="px-4 py-3.5 font-medium">
          Masalah
        </th>

        <th className="px-4 py-3.5 font-medium">
          Prioritas
        </th>

        <th className="px-5 py-3.5 font-medium">
          Status
        </th>
      </tr>
    </thead>

    <tbody className="divide-y divide-slate-100">
      {/* DATA HISTORY */}
      {paginatedTickets.map((ticket, index) => {
        const isNotResolvable = isNotResolvableTicket(ticket);
        const displayStatus = getHistoryStatus(ticket);

        return (
          <tr
            key={ticket.database_id || ticket.id}
            className="hover:bg-slate-50/70"
          >
            {/* NOMOR URUT */}
            <td className="px-4 py-4 text-center">
              <span className="font-medium text-slate-500">
                {startIndex + index + 1}
              </span>
            </td>

            {/* ID TIKET */}
            <td className="px-5 py-4">
              <p className="whitespace-nowrap font-medium text-[#172B4D]">
                {ticket.id}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatCompletionDate(getClosureDate(ticket))}
              </p>
            </td>

            {/* PELAPOR */}
            <td className="px-4 py-4">
              <p className="font-medium text-slate-700">
                {ticket.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {ticket.division} · {ticket.location}
              </p>
            </td>

            {/* MASALAH */}
            <td className="px-4 py-4">
              <p className="font-medium text-slate-700">
                {ticket.issue}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {ticket.device}
              </p>
            </td>

            {/* PRIORITAS */}
            <td className="px-4 py-4">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  ticket.priority === "Tinggi"
                    ? "bg-red-50 text-red-700"
                    : ticket.priority === "Medium"
                      ? "bg-amber-50 text-amber-700"
                      : ticket.priority === "Rendah"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {ticket.priority ?? "Belum ditentukan"}
              </span>
            </td>

            {/* STATUS */}
            <td className="px-5 py-4">
              <span
                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                  isNotResolvable
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {displayStatus}
              </span>
            </td>
          </tr>
        );
      })}

      {/* DATA KOSONG */}
      {completedTickets.length === 0 && (
        <tr>
          <td colSpan={6} className="px-5 py-12 text-center">
            <History
              className="mx-auto mb-3 text-slate-300"
              size={32}
            />

            <p className="text-sm font-medium text-slate-700">
              Belum ada riwayat tiket
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Tiket akan muncul setelah statusnya Selesai
              atau Tidak bisa diselesaikan.
            </p>
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

{/* PAGINATION */}
<div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

  {/* INFORMASI DATA */}
  <div className="text-sm text-slate-500">
    Menampilkan{" "}
    <span className="font-medium text-slate-700">
      {startItem}-{endItem}
    </span>{" "}
    dari{" "}
    <span className="font-medium text-slate-700">
      {completedTickets.length}
    </span>{" "}
    tiket
  </div>

  <div className="flex flex-wrap items-center gap-3">

    {/* JUMLAH TIKET PER HALAMAN */}
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm text-slate-500">
        Baris per halaman
      </span>

      <select
        aria-label="Jumlah tiket per halaman"
        value={pageSize}
        onChange={(event) => {
          setPageSize(Number(event.target.value));
          setCurrentPage(1);
        }}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        <option value={5}>5</option>
        <option value={10}>10</option>
        <option value={15}>15</option>
      </select>
    </div>

    {/* NAVIGASI HALAMAN */}
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setCurrentPage(safeCurrentPage - 1)}
        disabled={safeCurrentPage <= 1}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sebelumnya
      </button>

      <span className="whitespace-nowrap px-2 text-sm text-slate-600">
        {safeCurrentPage} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => setCurrentPage(safeCurrentPage + 1)}
        disabled={safeCurrentPage >= totalPages}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Berikutnya
      </button>
    </div>
  </div>
</div>
</section>
</div>
);
}