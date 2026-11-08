
"use client";

import { useEffect, useMemo, useState } from "react";
import TicketDetailDialog, {
  type TicketDetail,
} from "@/components/admin/ticket-detail-dialog";
import {
  Search,
  SlidersHorizontal,
  Ticket,
  Clock3,
  Wrench,
  Eye,
  AlertCircle,
} from "lucide-react";

// =============================================
// TYPES
// =============================================

type TicketStatus =
  | "Menunggu persetujuan"
  | "Belum dikerjakan"
  | "Sedang dikerjakan"
  | "Selesai"
  | "Tidak bisa diselesaikan"
  | "Status belum ditentukan";

type UpdateableStatus =
  | "Belum dikerjakan"
  | "Sedang dikerjakan"
  | "Selesai";

type TicketPriority = "Rendah" | "Medium" | "Tinggi" | null;

type TicketItem = Omit<TicketDetail, "status"> & {
  status: TicketStatus;
};

// =============================================
// FILTER STATUS
// =============================================

const statuses = [
  "Semua",
  "Menunggu persetujuan",
  "Belum dikerjakan",
  "Sedang dikerjakan",
  "Selesai",
  "Tidak bisa diselesaikan",
  "Status belum ditentukan",
] as const;

// =============================================
// WARNA BADGE STATUS
// =============================================

const statusStyles: Record<TicketStatus, string> = {
  "Menunggu persetujuan": "bg-slate-100 text-slate-700",
  "Belum dikerjakan": "bg-amber-50 text-amber-700",
  "Sedang dikerjakan": "bg-blue-50 text-blue-700",
  Selesai: "bg-emerald-50 text-emerald-700",
  "Tidak bisa diselesaikan": "bg-red-50 text-red-700",
  "Status belum ditentukan": "bg-slate-100 text-slate-500",
};

// =============================================
// NORMALISASI STATUS
// =============================================

function normalizeTicketStatus(
  status: unknown,
  resolutionResult: unknown
): TicketStatus {
  const currentStatus = String(status ?? "").trim();
  const result = String(resolutionResult ?? "").trim();

  // Prioritaskan hasil penanganan untuk tiket lama
  // yang status database-nya belum tersinkronisasi.
  if (result === "Tidak bisa diselesaikan") {
    return "Tidak bisa diselesaikan";
  }

  const allowedStatuses: TicketStatus[] = [
    "Menunggu persetujuan",
    "Belum dikerjakan",
    "Sedang dikerjakan",
    "Selesai",
    "Tidak bisa diselesaikan",
  ];

  if (allowedStatuses.includes(currentStatus as TicketStatus)) {
    return currentStatus as TicketStatus;
  }

  return "Status belum ditentukan";
}

function getDisplayStatus(ticket: TicketItem): TicketStatus {
  return normalizeTicketStatus(
    ticket.status,
    ticket.resolution_result
  );
}

function getDialogTicket(ticket: TicketItem): TicketDetail {
  return {
    ...ticket,
    status: getDisplayStatus(ticket) as TicketDetail["status"],
  };
}

// =============================================
// PESAN ERROR API
// =============================================

function getErrorMessage(
  result: unknown,
  fallback: string
): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result
  ) {
    return String(result.error);
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "message" in result
  ) {
    return String(result.message);
  }

  return fallback;
}

// =============================================
// FETCH DATA TIKET
// =============================================

async function fetchTickets(): Promise<TicketItem[]> {
  const response = await fetch("/api/tickets", {
    method: "GET",
    cache: "no-store",
  });

  const result: unknown = await response.json();

  if (
    !response.ok ||
    (
      typeof result === "object" &&
      result !== null &&
      "success" in result &&
      result.success === false
    )
  ) {
    throw new Error(
      getErrorMessage(result, "Gagal mengambil data tiket.")
    );
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("tickets" in result) ||
    !Array.isArray(result.tickets)
  ) {
    throw new Error("Format data tiket dari server tidak sesuai.");
  }

  const rows = result.tickets as Record<string, unknown>[];

  return rows.map((ticket) => {
    const normalizedStatus = normalizeTicketStatus(
      ticket.status,
      ticket.resolution_result
    );

    return {
      ...ticket,
      status: normalizedStatus,
    } as unknown as TicketItem;
  });
}

// =============================================
// HALAMAN TICKETING MANAGEMENT
// =============================================

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [search, setSearch] = useState("");
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [statusFilter, setStatusFilter] =
    useState<(typeof statuses)[number]>("Semua");

  const [priorityFilter, setPriorityFilter] =
    useState("Semua");

  const [selectedTicket, setSelectedTicket] =
    useState<TicketDetail | null>(null);

  const [approvalMessage, setApprovalMessage] = useState("");

  // =============================================
  // MEMUAT DAFTAR TIKET
  // =============================================

  useEffect(() => {
    let isMounted = true;

    async function loadTickets() {
      try {
        setLoadError("");

        const rows = await fetchTickets();

        if (isMounted) {
          setTickets(rows);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat data tiket."
          );
        }
      } finally {
        if (isMounted) {
          setTicketsLoaded(true);
        }
      }
    }

    void loadTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  // =============================================
  // APPROVAL DAN UPDATE STATUS
  // =============================================

  async function updateTicket(
    id: string,
    payload:
      | {
          action: "approve";
          priority: Exclude<TicketPriority, null>;
        }
      | {
          action: "update_status";
          status: UpdateableStatus;
        }
  ) {
    setIsUpdating(true);
    setApprovalMessage("");

    try {
      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_number: id,
          ...payload,
        }),
      });

      const result: unknown = await response.json();

      if (
        !response.ok ||
        (
          typeof result === "object" &&
          result !== null &&
          "success" in result &&
          result.success === false
        )
      ) {
        throw new Error(
          getErrorMessage(result, "Gagal memperbarui tiket.")
        );
      }

      // Ambil ulang data agar status dan detail tetap sinkron.
      const updatedTickets = await fetchTickets();

      setTickets(updatedTickets);

      setApprovalMessage(
        payload.action === "approve"
          ? `${id} diterima dengan prioritas ${payload.priority}.`
          : `${id} diperbarui menjadi ${payload.status}.`
      );

      setSelectedTicket(null);
    } catch (error) {
      setApprovalMessage(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui tiket."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  // =============================================
  // FILTER PENCARIAN, STATUS, DAN PRIORITAS
  // =============================================

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const query = search.toLowerCase().trim();
      const displayStatus = getDisplayStatus(ticket);

      const matchesSearch =
        !query ||
        ticket.id.toLowerCase().includes(query) ||
        ticket.name.toLowerCase().includes(query) ||
        ticket.issue.toLowerCase().includes(query) ||
        ticket.division.toLowerCase().includes(query) ||
        String(ticket.resolution_reason ?? "")
          .toLowerCase()
          .includes(query) ||
        displayStatus.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "Semua" ||
        displayStatus === statusFilter;

      const matchesPriority =
        priorityFilter === "Semua" ||
        (priorityFilter === "Rendah" &&
          ticket.priority === "Rendah") ||
        (priorityFilter === "Medium" &&
          ticket.priority === "Medium") ||
        (priorityFilter === "Tinggi" &&
          ticket.priority === "Tinggi") ||
        (priorityFilter === "Belum ditentukan" &&
          ticket.priority === null);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  // =============================================
  // STATISTIK TIKET
  // =============================================

  const pendingCount = tickets.filter(
    (ticket) =>
      getDisplayStatus(ticket) === "Menunggu persetujuan"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) =>
      getDisplayStatus(ticket) === "Sedang dikerjakan"
  ).length;

  const notResolvableCount = tickets.filter(
    (ticket) =>
      getDisplayStatus(ticket) === "Tidak bisa diselesaikan"
  ).length;

  // =============================================
  // TAMPILAN HALAMAN
  // =============================================

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">

      {/* HEADER */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-600">
            OPERASIONAL
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#172B4D] sm:text-3xl">
            Ticketing Management
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Tinjau pengajuan, tentukan prioritas, dan pantau
            progres penanganan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <Clock3 size={17} className="text-amber-600" />

            <span className="text-sm text-slate-600">
              Menunggu: <strong>{pendingCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <Wrench size={17} className="text-blue-600" />

            <span className="text-sm text-slate-600">
              Dikerjakan: <strong>{inProgressCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <AlertCircle size={17} className="text-red-600" />

            <span className="text-sm text-slate-600">
              Tidak bisa diselesaikan:{" "}
              <strong>{notResolvableCount}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* DAFTAR TIKET */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        {/* HEADER TABEL DAN FILTER */}
        <div className="space-y-4 border-b border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Ticket size={19} className="text-[#172B4D]" />

            <h3 className="font-semibold text-[#172B4D]">
              Daftar Tiket
            </h3>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {filteredTickets.length}
            </span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">

            {/* PENCARIAN */}
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari ID tiket, nama, divisi, atau masalah..."
                aria-label="Cari tiket"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* FILTER */}
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal
                size={17}
                className="text-slate-500"
              />

              <select
                aria-label="Filter status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as (typeof statuses)[number]
                  )
                }
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 sm:flex-none"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter prioritas"
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 sm:flex-none"
              >
                <option value="Semua">Semua prioritas</option>
                <option value="Rendah">Rendah</option>
                <option value="Medium">Medium</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Belum ditentukan">
                  Belum ditentukan
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {!ticketsLoaded && (
          <p className="px-5 py-4 text-sm text-slate-500">
            Memuat data tiket...
          </p>
        )}

        {/* ERROR */}
        {loadError && (
          <p role="alert" className="px-5 py-4 text-sm text-red-600">
            {loadError}
          </p>
        )}

        {/* TABEL */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-medium">
                  Tiket
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

                <th className="px-4 py-3.5 font-medium">
                  Status
                </th>

                <th className="px-5 py-3.5 text-right font-medium">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredTickets.map((ticket) => {
                const displayStatus = getDisplayStatus(ticket);

                return (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50/70"
                  >
                    {/* TIKET */}
                    <td className="px-5 py-4">
                      <p className="whitespace-nowrap font-medium text-[#172B4D]">
                        {ticket.id}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {ticket.time}
                      </p>
                    </td>

                    {/* PELAPOR */}
                    <td className="px-4 py-4">
                      <p className="whitespace-nowrap font-medium text-slate-700">
                        {ticket.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {ticket.division} · {ticket.location}
                      </p>
                    </td>

                    {/* MASALAH */}
                    <td className="max-w-[240px] px-4 py-4">
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
                                : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {ticket.priority ?? "Belum ditentukan"}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusStyles[displayStatus] ??
                          "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </td>

                    {/* AKSI */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTicket(getDialogTicket(ticket))
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={15} />
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* DATA KOSONG */}
              {ticketsLoaded && filteredTickets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Tidak ada tiket yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-500">
            Menampilkan {filteredTickets.length} dari {tickets.length} tiket.
          </p>
        </div>
      </section>

      {/* DIALOG DETAIL */}
      <TicketDetailDialog
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onApprove={(id, priority) => {
          void updateTicket(id, {
            action: "approve",
            priority,
          });
        }}
        onUpdateStatus={(id, status) => {
          void updateTicket(id, {
            action: "update_status",
            status,
          });
        }}
      />

      {/* INDIKATOR UPDATE */}
      {isUpdating && (
        <div className="fixed bottom-5 left-5 z-[70] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-lg">
          Menyimpan perubahan tiket...
        </div>
      )}

      {/* NOTIFIKASI */}
      {approvalMessage && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[70] rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            /gagal|error|tidak sesuai|muat ulang/i.test(approvalMessage)
              ? "bg-red-600"
              : "bg-emerald-600"
          }`}
        >
          {approvalMessage}
        </div>
      )}
    </div>
  );
}
