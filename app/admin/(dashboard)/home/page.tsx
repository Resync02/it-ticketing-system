"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  CheckCircle2,
  Clock3,
  Wrench,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

type TicketStatus =
  | "Menunggu persetujuan"
  | "Belum dikerjakan"
  | "Sedang dikerjakan"
  | "Selesai"
  | "Tidak bisa diselesaikan"
  | "Status belum ditentukan";

type TicketPriority = "Rendah" | "Medium" | "Tinggi" | null;

type TicketItem = {
  id: string;
  name: string;
  division: string;
  location: string;
  device: string;
  issue: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolution_result: string;
  time: string;
};

const statusStyles: Record<TicketStatus, string> = {
  "Menunggu persetujuan": "bg-slate-100 text-slate-700",
  "Belum dikerjakan": "bg-amber-50 text-amber-700",
  "Sedang dikerjakan": "bg-blue-50 text-blue-700",
  Selesai: "bg-emerald-50 text-emerald-700",
  "Tidak bisa diselesaikan": "bg-red-50 text-red-700",
  "Status belum ditentukan": "bg-slate-100 text-slate-500",
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBackground,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Inbox;
  iconColor: string;
  iconBackground: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className={`rounded-lg p-3 ${iconBackground}`}>
        <Icon className={iconColor} size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-[#172B4D]">
          {value.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function AdminHomePage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadTickets(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tickets", {
        method: "GET",
        cache: "no-store",
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result
            ? String(result.error)
            : typeof result === "object" &&
                result !== null &&
                "message" in result
              ? String(result.message)
              : "Gagal mengambil data tiket.";
        throw new Error(message);
      }


const resultData = result as {
  success?: boolean;
  error?: string;
  message?: string;
  tickets?: Record<string, unknown>[];
  data?: Record<string, unknown>[];
};

if (
  !response.ok ||
  resultData.success === false
) {
  throw new Error(
    resultData.error ||
    resultData.message ||
    "Gagal mengambil data tiket."
  );
}

const rows = Array.isArray(result)
  ? result
  : Array.isArray(resultData.tickets)
    ? resultData.tickets
    : Array.isArray(resultData.data)
      ? resultData.data
      : null;

if (!rows) {
  throw new Error("Format respons API tidak sesuai.");
}

const normalizedTickets: TicketItem[] = rows.map((ticket) => {
  const rawStatus = String(ticket.status ?? "").trim();

  const resolutionResult = String(
    ticket.resolution_result ?? ""
  ).trim();

  const allowedStatuses: TicketStatus[] = [
    "Menunggu persetujuan",
    "Belum dikerjakan",
    "Sedang dikerjakan",
    "Selesai",
    "Tidak bisa diselesaikan",
  ];

  // Prioritaskan hasil penanganan untuk tiket lama
  // yang status database-nya belum tersinkronisasi.
  const normalizedStatus: TicketStatus =
    resolutionResult === "Tidak bisa diselesaikan" ||
    rawStatus === "Tidak bisa diselesaikan"
      ? "Tidak bisa diselesaikan"
      : allowedStatuses.includes(rawStatus as TicketStatus)
        ? (rawStatus as TicketStatus)
        : "Status belum ditentukan";

  return {
    id: String(ticket.ticket_number ?? ticket.id ?? ""),
    name: String(ticket.reporter_name ?? ticket.name ?? ""),
    division: String(ticket.division ?? ""),
    location: String(ticket.location ?? ""),
    device: String(ticket.device ?? ""),
    issue: String(ticket.issue ?? ""),

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

    status: normalizedStatus,
    resolution_result: resolutionResult,
    time: String(ticket.created_at ?? ticket.time ?? ""),
  };
});

setTickets(normalizedTickets);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data tiket.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // State changes are intentionally initiated by the initial data request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTickets();
  }, []);

const stats = useMemo(() => {
  const completed = tickets.filter(
    (ticket) => ticket.status === "Selesai"
  ).length;

  const notResolvable = tickets.filter(
    (ticket) => ticket.status === "Tidak bisa diselesaikan"
  ).length;

  const pending = tickets.filter(
    (ticket) =>
      ticket.status === "Menunggu persetujuan" ||
      ticket.status === "Belum dikerjakan"
  ).length;

  const inProgress = tickets.filter(
    (ticket) => ticket.status === "Sedang dikerjakan"
  ).length;

  return {
    total: tickets.length,
    completed,
    notResolvable,
    pending,
    inProgress,
  };
}, [tickets]);

  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-600">OVERVIEW</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#172B4D] sm:text-3xl">
            Selamat datang, Admin
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pantau pengajuan dan progres penanganan IT Support
            dari satu tempat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTickets(true)}
            disabled={loading || refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Perbarui data
          </button>
          <Link
            href="/admin/tickets"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Kelola tiket
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Data dashboard gagal dimuat</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadTickets(true)}
            className="w-fit rounded-lg border border-red-200 bg-white px-3 py-2 font-medium hover:bg-red-100"
          >
            Coba lagi
          </button>
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-semibold text-[#172B4D]">Ringkasan Tiket</h3>
            <p className="mt-1 text-sm text-slate-500">
              Statistik dihitung langsung dari data tiket di database.
            </p>
          </div>
          {!loading && !error && (
            <p className="text-xs text-slate-400">
              {tickets.length.toLocaleString("id-ID")} tiket terdata
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Ticket"
            value={stats.total}
            description="Seluruh pengajuan tiket"
            icon={Inbox}
            iconColor="text-blue-700"
            iconBackground="bg-blue-50"
          />
          <StatCard
            title="Selesai"
            value={stats.completed}
            description="Tiket telah diselesaikan"
            icon={CheckCircle2}
            iconColor="text-emerald-700"
            iconBackground="bg-emerald-50"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            description="Menunggu persetujuan atau pengerjaan"
            icon={Clock3}
            iconColor="text-amber-700"
            iconBackground="bg-amber-50"
          />
          <StatCard
            title="Sedang Dikerjakan"
            value={stats.inProgress}
            description="Tiket aktif ditangani"
            icon={Wrench}
            iconColor="text-violet-700"
            iconBackground="bg-violet-50"
          />
          <StatCard
            title="Tidak Bisa Diselesaikan"
            value={stats.notResolvable}
            description="Tiket ditutup tanpa perbaikan"
            icon={AlertCircle}
            iconColor="text-red-700"
            iconBackground="bg-red-50"
          />
        </div>
        {loading && (
          <p className="mt-3 text-sm text-slate-500">Memuat statistik tiket...</p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="font-semibold text-[#172B4D]">Tiket Terbaru</h3>
            <p className="mt-1 text-sm text-slate-500">
              Lima tiket terbaru yang masuk ke sistem.
            </p>
          </div>
          <Link
            href="/admin/tickets"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Lihat semua <ArrowRight size={15} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-medium">ID Tiket</th>
                <th className="px-4 py-3.5 font-medium">Pelapor</th>
                <th className="px-4 py-3.5 font-medium">Masalah</th>
                <th className="px-4 py-3.5 font-medium">Prioritas</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    Memuat tiket terbaru...
                  </td>
                </tr>
              ) : recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="whitespace-nowrap font-medium text-[#172B4D]">
                        {ticket.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{ticket.time}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-700">{ticket.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ticket.division} · {ticket.location}
                      </p>
                    </td>
                    <td className="max-w-[320px] px-4 py-4">
                      <p className="line-clamp-2 font-medium text-slate-700">
                        {ticket.issue}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{ticket.device}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                          ticket.priority === "Tinggi"
                            ? "bg-red-50 text-red-700"
                            : ticket.priority === "Medium"
                              ? "bg-amber-50 text-amber-700"
                              : ticket.priority === "Rendah"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {ticket.priority ?? "Belum ditentukan"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[ticket.status] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Inbox className="mx-auto mb-3 text-slate-300" size={32} />
                    <p className="text-sm font-medium text-slate-700">
                      Belum ada tiket
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Tiket yang dikirim melalui form akan tampil di sini.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
