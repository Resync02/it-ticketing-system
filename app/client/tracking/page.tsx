"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Search,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const statusSteps = [
  "Menunggu persetujuan",
  "Belum dikerjakan",
  "Sedang dikerjakan",
  "Selesai",
] as const;

type TicketStatus =
  | (typeof statusSteps)[number]
  | "Tidak bisa diselesaikan";

type TrackTicket = {
  ticket_number: string;
  reporter_name: string;
  division: string;
  location: string;
  device: string;
  issue: string;
  impact: string;
  priority: string | null;
  status: TicketStatus;
  resolution_completed_reason: string;
  assigned_pic_name: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type TrackFeedback = {
  confirmation: "Belum Selesai" | "Sudah Selesai";
  reason: string;
  created_at: string;
};

type TrackingData = {
  ticket: TrackTicket;
  latest_feedback: TrackFeedback | null;
  confirmation_submitted_for_current_completion: boolean;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: TrackingData;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Selesai":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Sedang dikerjakan":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Belum dikerjakan":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Tidak bisa diselesaikan":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case "Menunggu persetujuan":
      return "Laporan sudah diterima dan sedang menunggu persetujuan tim IT.";
    case "Belum dikerjakan":
      return "Tiket sudah masuk antrean dan menunggu penanganan tim IT.";
    case "Sedang dikerjakan":
      return "Tim IT sedang memeriksa dan menangani kendala Anda.";
    case "Selesai":
      return "Tim IT telah menyelesaikan penanganan. Mohon konfirmasi hasilnya.";
    case "Tidak bisa diselesaikan":
      return "Tim IT telah memperbarui hasil penanganan. Silakan hubungi tim IT untuk tindak lanjut.";
    default:
      return "Status tiket belum tersedia.";
  }
}

export default function TicketTrackingPage() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<TrackingData | null>(null);
  const [selectedConfirmation, setSelectedConfirmation] = useState<
    "Belum Selesai" | "Sudah Selesai" | ""
  >("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currentStatus = data?.ticket.status ?? "";
  const currentStep = useMemo(() => {
    const index = statusSteps.indexOf(currentStatus as (typeof statusSteps)[number]);
    return index < 0 ? -1 : index;
  }, [currentStatus]);

  async function lookupTicket(
    nextTicketNumber = ticketNumber,
    nextPhone = phone
  ) {
    const response = await fetch("/api/tickets/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        action: "lookup",
        ticket_number: nextTicketNumber.trim(),
        phone: nextPhone.trim(),
      }),
    });

    const result = (await response.json()) as ApiResponse;

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Gagal mengambil data tiket.");
    }

    setData(result.data);
    setSelectedConfirmation("");
    setReason("");
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setData(null);

    try {
      await lookupTicket();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mencari tiket."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !selectedConfirmation) return;

    if (selectedConfirmation === "Belum Selesai" && reason.trim().length < 5) {
      setError("Tuliskan alasan minimal 5 karakter agar tim IT dapat menindaklanjuti.");
      return;
    }


    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/tickets/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "submit_confirmation",
          ticket_number: data.ticket.ticket_number,
          phone,
          confirmation: selectedConfirmation,
          reason: selectedConfirmation === "Belum Selesai" ? reason.trim() : undefined,
        }),
      });

      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menyimpan konfirmasi.");
      }

      setNotice(result.message || "Konfirmasi berhasil disimpan.");
      await lookupTicket(data.ticket.ticket_number, phone);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan konfirmasi."
      );
    } finally {
      setBusy(false);
    }
  }

  const showConfirmationForm =
    currentStatus === "Selesai" &&
    !data?.confirmation_submitted_for_current_completion;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Link
            href="/client/ticket"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-700"
          >
            <ArrowLeft size={16} />
            Kembali ke formulir laporan
          </Link>

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
            <Ticket size={25} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            IT Ticket System
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Lacak Status Tiket
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Masukkan nomor tiket dan nomor WhatsApp yang digunakan saat membuat laporan untuk melihat perkembangan penanganan.
          </p>
        </header>

        <form
          onSubmit={handleLookup}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-800">
              Nomor Tiket *
              <input
                value={ticketNumber}
                onChange={(event) => setTicketNumber(event.target.value.toUpperCase())}
                className={inputClass}
                maxLength={30}
                required
                placeholder="Contoh: IT-01-001-MNG"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              Nomor WhatsApp Pelapor *
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClass}
                maxLength={30}
                required
                placeholder="Nomor yang digunakan saat melapor"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Nomor WhatsApp digunakan untuk memverifikasi kepemilikan tiket.
            </p>
            <button
              type="submit"
              disabled={busy || !ticketNumber.trim() || !phone.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={17} />
              {busy ? "Memeriksa..." : "Lacak Tiket"}
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div role="status" className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
            <p>{notice}</p>
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nomor Tiket
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {data.ticket.ticket_number}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Diajukan {formatDate(data.ticket.created_at)}
                  </p>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(data.ticket.status)}`}>
                  {data.ticket.status}
                </span>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-700">
                  {getStatusDescription(data.ticket.status)}
                </p>
              </div>

              {data.ticket.status === "Tidak bisa diselesaikan" ? (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  Status tiket telah ditetapkan sebagai <strong>Tidak bisa diselesaikan</strong>. Hubungi tim IT apabila Anda memerlukan penjelasan atau tindak lanjut.
                </div>
              ) : (
                <div className="mt-7">
                  <div className="grid grid-cols-4 gap-2">
                    {statusSteps.map((step, index) => {
                      const reached = currentStep >= index;
                      const isCurrent = currentStep === index;
                      return (
                        <div key={step} className="min-w-0">
                          <div className={`h-1.5 rounded-full ${reached ? "bg-blue-700" : "bg-slate-200"}`} />
                          <p className={`mt-2 text-[10px] leading-4 sm:text-xs ${isCurrent ? "font-bold text-blue-800" : reached ? "font-medium text-slate-700" : "text-slate-400"}`}>
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-7 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <UserRound className="mt-0.5 text-slate-400" size={18} />
                  <div>
                    <p className="text-xs text-slate-500">Pelapor</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">{data.ticket.reporter_name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 text-slate-400" size={18} />
                  <div>
                    <p className="text-xs text-slate-500">Pembaruan terakhir</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">{formatDate(data.ticket.updated_at)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Divisi / Lokasi</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{data.ticket.division} · {data.ticket.location}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kategori permasalahan</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{data.ticket.device}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PIC</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{data.ticket.assigned_pic_name || "Belum ditetapkan"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prioritas</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{data.ticket.priority || "Belum ditentukan"}</p>
                </div>
              </div>

              {data.ticket.status === "Selesai" && data.ticket.resolution_completed_reason && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-900">Catatan penyelesaian dari tim IT</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-emerald-900">
                    {data.ticket.resolution_completed_reason}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-800">Kendala yang dilaporkan</h3>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{data.ticket.issue}</p>
              </div>

              {data.ticket.impact && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-800">Dampak terhadap pekerjaan</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm leading-6 text-slate-700">{data.ticket.impact}</p>
                </div>
              )}
            </section>

            {data.latest_feedback && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-sm font-semibold text-slate-900">Validasi pengguna terakhir</h3>
                <p className="mt-2 text-xs text-slate-500">{formatDate(data.latest_feedback.created_at)}</p>
                <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${data.latest_feedback.confirmation === "Belum Selesai" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                  {data.latest_feedback.confirmation}
                </p>
                {data.latest_feedback.reason && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{data.latest_feedback.reason}</p>
                )}
              </section>
            )}

            {showConfirmationForm && (
              <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Apakah masalah sudah selesai?</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Periksa kembali perangkat atau layanan yang dilaporkan sebelum memberikan konfirmasi.</p>
                  </div>
                </div>

                <form onSubmit={handleConfirmation} className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConfirmation("Sudah Selesai");
                        setError("");
                      }}
                      className={`rounded-xl border p-4 text-left transition ${selectedConfirmation === "Sudah Selesai" ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 size={18} className="text-emerald-600" /> Sudah Selesai</span>
                      <span className="mt-2 block text-xs leading-5 text-slate-500">Masalah sudah teratasi dan pekerjaan dapat dilanjutkan.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConfirmation("Belum Selesai");
                        setError("");
                      }}
                      className={`rounded-xl border p-4 text-left transition ${selectedConfirmation === "Belum Selesai" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100" : "border-slate-200 hover:border-amber-300"}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><AlertCircle size={18} className="text-amber-600" /> Belum Selesai</span>
                      <span className="mt-2 block text-xs leading-5 text-slate-500">Masalah masih terjadi atau belum sepenuhnya teratasi.</span>
                    </button>
                  </div>

                  {selectedConfirmation === "Belum Selesai" && (
                    <label className="block text-sm font-semibold text-slate-800">
                      Jelaskan alasan masalah belum selesai *
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className={inputClass}
                        rows={4}
                        maxLength={2000}
                        required
                        placeholder="Contoh: koneksi masih terputus setelah dilakukan restart..."
                      />
                      <span className="mt-1 block text-right text-xs font-normal text-slate-500">{reason.length}/2000 karakter</span>
                    </label>
                  )}

                  {selectedConfirmation && (
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? "Menyimpan..." : "Kirim Konfirmasi"}
                    </button>
                  )}
                </form>
              </section>
            )}

            {data.confirmation_submitted_for_current_completion && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                <p>Terima kasih. Anda sudah mengonfirmasi bahwa masalah telah selesai.</p>
              </div>
            )}
          </div>
        )}

        <footer className="mt-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
          <p>IT Support Ticketing System</p>
          <Link href="/client/ticket" className="font-medium text-blue-700 hover:text-blue-800">
            Buat laporan baru
          </Link>
        </footer>
      </div>
    </main>
  );
}