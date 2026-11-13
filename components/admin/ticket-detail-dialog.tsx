
"use client";

import { useEffect, useState } from "react";
import {
  X,
  UserRound,
  Phone,
  MapPin,
  Monitor,
  CalendarClock,
  Clock3,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Play,
  Wrench,
  Image as ImageIcon,
  ZoomIn,
  LockKeyhole,
  Star,
} from "lucide-react";

export type TicketDetail = {
  id: string;
  name: string;
  reporter_phone?: string | null;
  division: string;
  location: string;
  device: string;
  issue: string;
  impact?: string;
  device_type?: string;
  priority: "Rendah" | "Medium" | "Tinggi" | null;
  status:
    | "Menunggu persetujuan"
    | "Belum dikerjakan"
    | "Sedang dikerjakan"
    | "Selesai"
    | "Tidak bisa diselesaikan";
  time: string;
  photoAttachmentId?: string | null;
  proofAttachmentId?: string | null;
  assigned_pic_id?: string | null;
  assigned_pic_name?: string | null;
  initial_analysis?: string;
  root_cause?: string;
  corrective_action?: string;
  part_replaced?: boolean;
  part_replaced_description?: string;
  component_cost?: number | null;
  resolution_result?: string;
  resolution_reason?: string;
  resolution_completed_reason?: string;
  customer_confirmation?: string;
  customer_reason?: string;
  customer_rating?: number | null;
  customer_review?: string;
  customer_feedback_at?: string;
};

type TicketStatus = TicketDetail["status"];

type Props = {
  ticket: TicketDetail | null;
  onClose: () => void;
  onApprove: (
    id: string,
    priority: "Rendah" | "Medium" | "Tinggi"
  ) => void;
  onUpdateStatus: (
    id: string,
    status: Exclude<
      TicketStatus,
      "Menunggu persetujuan" | "Tidak bisa diselesaikan"
    >
  ) => void;
  onPicAssigned?: (
    ticketId: string,
    pic: { id: string; name: string }
  ) => void;
};

function formatSubmissionDateTime(value: string) {
  if (!value) {
    return { date: "-", time: "-" };
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return { date: value, time: "-" };
  }

  return {
    date: new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(parsedDate),

    time:
      new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(parsedDate) + " WIB",
  };
}

export default function TicketDetailDialog({
  ticket,
  onClose,
  onApprove,
  onUpdateStatus,
  onPicAssigned,
}: Props) {
  const [priority, setPriority] = useState<
    "Rendah" | "Medium" | "Tinggi"
  >("Rendah");

  const [imagePreview, setImagePreview] = useState<{
    src: string;
    title: string;
  } | null>(null);

  // PIC
  const [assignedPic, setAssignedPic] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [pics, setPics] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [picId, setPicId] = useState(
    ticket?.assigned_pic_id ?? ""
  );
  const [picSaving, setPicSaving] = useState(false);
  const [picMessage, setPicMessage] = useState("");

  // Analisa dan penyelesaian
  const [analysis, setAnalysis] = useState(
    ticket?.initial_analysis ?? ""
  );
  const [cause, setCause] = useState(
    ticket?.root_cause ?? ""
  );
  const [actionText, setActionText] = useState(
    ticket?.corrective_action ?? ""
  );
  const [partReplaced, setPartReplaced] = useState(
    Boolean(ticket?.part_replaced)
  );
  const [partDescription, setPartDescription] = useState(
    ticket?.part_replaced_description ?? ""
  );
  const [cost, setCost] = useState(
    String(ticket?.component_cost ?? "0")
  );
  const [outcome, setOutcome] = useState(
    ticket?.resolution_result ?? ""
  );

  // Alasan jika tidak bisa diselesaikan
  const [resolutionReason, setResolutionReason] = useState(
    ticket?.resolution_reason ?? ""
  );
  // Alasan ketika tiket berhasil diselesaikan
  const [resolutionCompletedReason, setResolutionCompletedReason] =
    useState(ticket?.resolution_completed_reason ?? "");

  const [proof, setProof] = useState<File | null>(null);
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(false);

  // Reset data saat admin membuka tiket berbeda
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPriority(ticket?.priority ?? "Rendah");
    setPicId(ticket?.assigned_pic_id ?? "");
    setAssignedPic(null);
    setPicMessage("");

    setAnalysis(ticket?.initial_analysis ?? "");
    setCause(ticket?.root_cause ?? "");
    setActionText(ticket?.corrective_action ?? "");

    setPartReplaced(Boolean(ticket?.part_replaced));
    setPartDescription(
      ticket?.part_replaced_description ?? ""
    );
    setCost(String(ticket?.component_cost ?? "0"));
    setOutcome(ticket?.resolution_result ?? "");

    setResolutionReason(ticket?.resolution_reason ?? "");
    setResolutionCompletedReason(
      ticket?.resolution_completed_reason ?? ""
    );

    setProof(null);
    setWorkflowMessage("");
    setImagePreview(null);
  }, [
    ticket?.id,
    ticket?.priority,
    ticket?.assigned_pic_id,
    ticket?.initial_analysis,
    ticket?.root_cause,
    ticket?.corrective_action,
    ticket?.part_replaced,
    ticket?.part_replaced_description,
    ticket?.component_cost,
    ticket?.resolution_result,
    ticket?.resolution_reason,
    ticket?.resolution_completed_reason,
  ]);

  // Mengambil daftar PIC aktif
  useEffect(() => {
    fetch("/api/admin/pics", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setPics(
            result.pics
              .filter((pic: { is_active: number }) => pic.is_active)
              .map((pic: { id: number; name: string }) => ({
                id: pic.id,
                name: pic.name,
              }))
          );
        }
      })
      .catch(() => {
        // Daftar PIC gagal dimuat.
      });
  }, []);

  // Penetapan PIC satu kali
  async function assignPic() {
    if (
      !ticket ||
      !picId ||
      ticket.assigned_pic_id ||
      picSaving
    ) {
      return;
    }

    setPicSaving(true);
    setPicMessage("");

    try {
      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_number: ticket.id,
          action: "assign_pic",
          assigned_pic_id: picId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Gagal menetapkan PIC."
        );
      }

      const selectedPic = pics.find(
        (pic) => String(pic.id) === String(picId)
      );

      if (!selectedPic) {
        throw new Error(
          "PIC berhasil diproses, tetapi nama PIC tidak ditemukan. Muat ulang data tiket untuk memeriksa penetapan."
        );
      }

      const assigned = {
        id: String(selectedPic.id),
        name: selectedPic.name,
      };

      setAssignedPic(assigned);
      setPicId(assigned.id);
      onPicAssigned?.(ticket.id, assigned);
      setPicMessage("PIC berhasil ditetapkan dan dikunci.");
    } catch (error) {
      setPicMessage(
        error instanceof Error
          ? error.message
          : "Gagal menetapkan PIC."
      );
    } finally {
      setPicSaving(false);
    }
  }

  // Menyimpan laporan penanganan admin
  async function submitWorkflow() {
    if (!ticket) return;

    if (
      !analysis.trim() ||
      !cause.trim() ||
      !actionText.trim() ||
      !outcome
    ) {
      setWorkflowMessage(
        "Lengkapi analisa, penyebab, tindakan, dan hasil penanganan."
      );
      return;
    }

    if (partReplaced && !partDescription.trim()) {
      setWorkflowMessage("Isi nama part yang diganti.");
      return;
    }

    // Validasi alasan tidak bisa diselesaikan
    if (
      outcome === "Tidak bisa diselesaikan" &&
      !resolutionReason.trim()
    ) {
      setWorkflowMessage(
        "Alasan tidak bisa diselesaikan wajib diisi."
      );
      return;
    }

    if (resolutionReason.length > 1000) {
      setWorkflowMessage(
        "Alasan tidak boleh lebih dari 1000 karakter."
      );
      return;
    }

    // Validasi alasan ketika tiket berhasil diselesaikan
    if (
      outcome === "Selesai" &&
      !resolutionCompletedReason.trim()
    ) {
      setWorkflowMessage("Alasan diselesaikan wajib diisi.");
      return;
    }

    if (resolutionCompletedReason.length > 1000) {
      setWorkflowMessage(
        "Alasan diselesaikan tidak boleh lebih dari 1000 karakter."
      );
      return;
    }

    // Bukti wajib hanya untuk hasil Selesai
    if (
      outcome === "Selesai" &&
      !proof &&
      !ticket.proofAttachmentId
    ) {
      setWorkflowMessage(
        "Bukti gambar wajib diunggah untuk hasil Selesai."
      );
      return;
    }

    setWorkflowBusy(true);
    setWorkflowMessage("");

    try {
      let proofPayload:
        | {
            base64: string;
            name: string;
            mimeType: string;
          }
        | undefined;

      if (proof) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(
            proof.type
          )
        ) {
          throw new Error(
            "Bukti harus berformat JPG, PNG, atau WEBP."
          );
        }

        if (
          proof.size === 0 ||
          proof.size > 4 * 1024 * 1024
        ) {
          throw new Error(
            "Ukuran bukti gambar maksimal 4 MB."
          );
        }

        const base64 = await new Promise<string>(
          (resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              resolve(
                String(reader.result).split(",")[1] ?? ""
              );
            };

            reader.onerror = () => {
              reject(
                new Error("Gagal membaca file gambar.")
              );
            };

            reader.readAsDataURL(proof);
          }
        );

        proofPayload = {
          base64,
          name: proof.name,
          mimeType: proof.type,
        };
      }

      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_number: ticket.id,
          action: "save_worklog",
          initial_analysis: analysis,
          root_cause: cause,
          corrective_action: actionText,
          part_replaced: partReplaced,
          part_replaced_description: partReplaced
            ? partDescription.trim()
            : "",
          component_cost: cost,
          resolution_result: outcome,

          // Alasan untuk masing-masing hasil disimpan terpisah
          resolution_reason:
            outcome === "Tidak bisa diselesaikan"
              ? resolutionReason.trim()
              : null,
          resolution_completed_reason:
            outcome === "Selesai"
              ? resolutionCompletedReason.trim()
              : null,

          proof: proofPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Gagal menyimpan catatan penanganan."
        );
      }

      window.location.reload();
    } catch (error) {
      setWorkflowMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan laporan penanganan."
      );
    } finally {
      setWorkflowBusy(false);
    }
  }

  // Menutup preview foto lampiran maupun bukti dengan tombol Escape.
  useEffect(() => {
    if (!imagePreview) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setImagePreview(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [imagePreview]);

  if (!ticket) return null;

  const currentAssignedPic =
    assignedPic ??
    (ticket.assigned_pic_id
      ? {
          id: String(ticket.assigned_pic_id),
          name: ticket.assigned_pic_name || "PIC telah ditetapkan",
        }
      : null);

const ticketId = ticket.id;

const isPending =
  ticket.status === "Menunggu persetujuan";

const isNotStarted =
  ticket.status === "Belum dikerjakan";

const isInProgress =
  ticket.status === "Sedang dikerjakan";

const isCompleted =
  ticket.status === "Selesai";

const isNotResolvable =
  ticket.status === "Tidak bisa diselesaikan";

const isClosed = isCompleted || isNotResolvable;

const hasSavedWorklog = Boolean(ticket.resolution_result);

const showWorklogSummary = isClosed || hasSavedWorklog;

  const photoUrl = ticket.photoAttachmentId
    ? `/api/tickets/attachments/${encodeURIComponent(
        ticket.photoAttachmentId
      )}`
    : null;

  const proofUrl = ticket.proofAttachmentId
    ? `/api/tickets/attachments/${encodeURIComponent(
        ticket.proofAttachmentId
      )}`
    : null;

  function handleStartWork() {
    if (!picId) {
      setWorkflowMessage(
        "Tetapkan PIC terlebih dahulu sebelum memulai pengerjaan."
      );
      return;
    }

    onUpdateStatus(ticketId, "Sedang dikerjakan");
  }

  return (
    <>
      {/* DIALOG DETAIL TIKET */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-detail-title"
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Detail Pengajuan
              </p>

              <h2
                id="ticket-detail-title"
                className="mt-1 text-xl font-semibold text-[#172B4D]"
              >
                {ticket.id}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Periksa informasi dan perbarui progres penanganan tiket.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail tiket"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </header>

          <div className="space-y-6 p-6">
            {/* INFORMASI PELAPOR */}
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem
                icon={<UserRound size={18} />}
                label="Nama pelapor"
                value={ticket.name}
              />

              <InfoItem
                icon={<Phone size={18} />}
                label="Nomor Telepon / WhatsApp"
                value={ticket.reporter_phone || "Belum tersedia"}
              />

              <InfoItem
                icon={<UserRound size={18} />}
                label="Divisi"
                value={ticket.division}
              />

              <InfoItem
                icon={<MapPin size={18} />}
                label="Lokasi"
                value={ticket.location}
              />

              <InfoItem
                icon={<Monitor size={18} />}
                label="Perangkat"
                value={ticket.device}
              />

              {ticket.device_type && (
                <InfoItem
                  icon={<Monitor size={18} />}
                  label="Tipe perangkat / identitas"
                  value={ticket.device_type}
                />
              )}

              <InfoItem
                icon={<CalendarClock size={18} />}
                label="Tanggal pengajuan"
                value={formatSubmissionDateTime(ticket.time).date}
              />

              <InfoItem
                icon={<Clock3 size={18} />}
                label="Waktu pengajuan"
                value={formatSubmissionDateTime(ticket.time).time}
              />
            </div>

            {/* DETAIL MASALAH */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Detail masalah
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {ticket.issue}
              </p>
            </div>

            {/* DAMPAK DARI PELAPOR */}
            {ticket.impact?.trim() && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Dampak terhadap pekerjaan
                </h3>

                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-6 text-slate-700">
                  {ticket.impact}
                </p>
              </div>
            )}

            {/* VALIDASI DAN REVIEW PENGGUNA */}
            {ticket.customer_confirmation && (
              <section
                className={`space-y-3 rounded-xl border p-4 ${
                  ticket.customer_confirmation === "Belum Selesai"
                    ? "border-amber-200 bg-amber-50/60"
                    : "border-emerald-200 bg-emerald-50/60"
                }`}
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Validasi dan penilaian pengguna
                </h3>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      ticket.customer_confirmation === "Belum Selesai"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {ticket.customer_confirmation}
                  </span>
                  {ticket.customer_feedback_at && (
                    <span className="text-xs text-slate-500">
                      {formatSubmissionDateTime(ticket.customer_feedback_at).date} · {formatSubmissionDateTime(ticket.customer_feedback_at).time}
                    </span>
                  )}
                </div>

                {ticket.customer_reason && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">
                      Alasan masalah belum selesai
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                      {ticket.customer_reason}
                    </p>
                  </div>
                )}

                {ticket.customer_rating != null && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">
                      Rating layanan IT Support
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={17}
                          fill={index < Number(ticket.customer_rating) ? "currentColor" : "none"}
                        />
                      ))}
                      <span className="ml-1 text-sm font-semibold text-slate-700">
                        {ticket.customer_rating}/5
                      </span>
                    </div>
                  </div>
                )}

                {ticket.customer_review && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">
                      Review pengguna
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                      {ticket.customer_review}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* FOTO LAMPIRAN */}
            <section aria-labelledby="ticket-photo-title">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-slate-500" />

                <h3
                  id="ticket-photo-title"
                  className="text-sm font-semibold text-slate-800"
                >
                  Foto lampiran
                </h3>
              </div>

              {photoUrl ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setImagePreview({
                        src: photoUrl,
                        title: "Foto Lampiran",
                      })
                    }
                    aria-label={`Perbesar foto lampiran tiket ${ticket.id}`}
                    className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={`Lampiran foto tiket ${ticket.id}`}
                      className="max-h-[320px] w-full object-contain transition duration-200 group-hover:scale-[1.01]"
                      loading="lazy"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/20">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-800 opacity-0 shadow-lg transition group-hover:opacity-100">
                        <ZoomIn size={17} />
                        Perbesar gambar
                      </span>
                    </div>
                  </button>

                  <p className="mt-2 text-xs text-slate-500">
                    Klik gambar untuk melihat ukuran penuh.
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  <ImageIcon size={18} />
                  Tidak ada foto lampiran untuk tiket ini.
                </div>
              )}
            </section>

            {/* PENANGGUNG JAWAB (PIC) */}
            {!isPending && (
              <section className="space-y-3 rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Penanggung Jawab (PIC)
                </h3>

                {currentAssignedPic ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <LockKeyhole size={18} />

                      <span className="text-xs font-bold uppercase tracking-wide">
                        PIC Terkunci
                      </span>
                    </div>

                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {currentAssignedPic.name}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle2 size={15} />

                      <span>
                        PIC sudah divalidasi dan tidak dapat diubah.
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        value={picId}
                        onChange={(event) =>
                          setPicId(event.target.value)
                        }
                        disabled={picSaving}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                      >
                        <option value="">Pilih PIC</option>

                        {pics.map((pic) => (
                          <option key={pic.id} value={pic.id}>
                            {pic.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!picId || picSaving}
                        onClick={() => void assignPic()}
                        className="rounded-lg bg-[#172B4D] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {picSaving
                          ? "Memvalidasi..."
                          : "Tetapkan PIC"}
                      </button>
                    </div>

                    {picMessage && (
                      <p
                        role="status"
                        className={`text-sm ${
                          picMessage.toLowerCase().includes("berhasil")
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {picMessage}
                      </p>
                    )}

                    <p className="text-xs text-slate-500">
                      PIC hanya dapat ditetapkan satu kali. Pastikan
                      pilihan sudah benar sebelum melakukan validasi.
                    </p>
                  </>
                )}
              </section>
            )}

            {/* FORM ANALISA DAN PENYELESAIAN */}
            {isInProgress && (
              <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Laporan penanganan IT
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Lengkapi catatan teknis sebelum menentukan hasil
                    penanganan.
                  </p>
                </div>

                {/* ANALISA, PENYEBAB, DAN TINDAKAN */}
                {[
                  {
                    label: "Analisa Awal",
                    value: analysis,
                    set: setAnalysis,
                    placeholder: "Hasil pemeriksaan awal...",
                  },
                  {
                    label: "Penyebab Masalah",
                    value: cause,
                    set: setCause,
                    placeholder: "Akar penyebab kendala...",
                  },
                  {
                    label: "Tindakan Perbaikan",
                    value: actionText,
                    set: setActionText,
                    placeholder: "Langkah perbaikan yang dilakukan...",
                  },
                ].map((field) => (
                  <label
                    key={field.label}
                    className="block text-sm font-medium text-slate-700"
                  >
                    {field.label} *

                    <textarea
                      value={field.value}
                      onChange={(event) =>
                        field.set(event.target.value)
                      }
                      rows={3}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                      placeholder={field.placeholder}
                    />
                  </label>
                ))}

                {/* PART DIGANTI */}
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Part diganti? *
                  </p>

                  <div className="mt-2 flex gap-5 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={partReplaced}
                        onChange={() => setPartReplaced(true)}
                      />
                      Ada
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!partReplaced}
                        onChange={() => {
                          setPartReplaced(false);
                          setPartDescription("");
                        }}
                      />
                      Tidak ada
                    </label>
                  </div>

                  {partReplaced && (
                    <input
                      value={partDescription}
                      onChange={(event) =>
                        setPartDescription(event.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
                      placeholder="Nama part/komponen yang diganti"
                    />
                  )}
                </div>

                {/* BIAYA */}
                <label className="block text-sm font-medium text-slate-700">
                  Biaya (Rp)

                  <input
                    type="number"
                    min="0"
                    value={cost}
                    onChange={(event) => setCost(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm"
                    placeholder="0"
                  />
                </label>

                {/* HASIL PENANGANAN */}
                <label className="block text-sm font-medium text-slate-700">
                  Hasil penanganan *

                  <select
                    value={outcome}
                    onChange={(event) =>
                      setOutcome(event.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                  >
                    <option value="">Pilih hasil</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Belum selesai">
                      Belum selesai
                    </option>
                    <option value="Tidak bisa diselesaikan">
                      Tidak bisa diselesaikan
                    </option>
                  </select>
                </label>

                {/* ALASAN TIDAK BISA DISELESAIKAN */}
                {outcome === "Tidak bisa diselesaikan" && (
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <label
                      htmlFor="resolution-reason"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Alasan tidak bisa diselesaikan *
                    </label>

                    <textarea
                      id="resolution-reason"
                      value={resolutionReason}
                      onChange={(event) =>
                        setResolutionReason(event.target.value)
                      }
                      maxLength={1000}
                      rows={3}
                      required
                      placeholder="Jelaskan secara singkat mengapa masalah tidak dapat diselesaikan..."
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                    />

                    <p className="mt-1 text-right text-xs text-slate-500">
                      {resolutionReason.length}/1000 karakter
                    </p>
                  </div>
                )}

                {/* ALASAN DISELESAIKAN */}
                {outcome === "Selesai" && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <label
                      htmlFor="resolution-completed-reason"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Alasan Diselesaikan *
                    </label>

                    <textarea
                      id="resolution-completed-reason"
                      value={resolutionCompletedReason}
                      onChange={(event) =>
                        setResolutionCompletedReason(event.target.value)
                      }
                      maxLength={1000}
                      rows={3}
                      required
                      placeholder="Jelaskan hasil perbaikan dan alasan tiket dinyatakan selesai..."
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />

                    <p className="mt-1 text-right text-xs text-slate-500">
                      {resolutionCompletedReason.length}/1000 karakter
                    </p>
                  </div>
                )}

                {/* BUKTI PENYELESAIAN */}
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Bukti penyelesaian (gambar)
                  </p>

                  <label
                    htmlFor="proof-upload"
                    className="mt-2 flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/50 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
                  >
                    <input
                      id="proof-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setProof(event.target.files?.[0] ?? null)
                      }
                      className="sr-only"
                    />

                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <ImageIcon size={25} />
                    </span>

                    {proof ? (
                      <>
                        <span className="max-w-full break-all text-sm font-semibold text-slate-800">
                          {proof.name}
                        </span>

                        <span className="mt-1 text-xs text-emerald-700">
                          Gambar dipilih · Klik area ini untuk mengganti
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-slate-800">
                          Klik untuk upload bukti gambar
                        </span>

                        <span className="mt-1 text-xs text-slate-500">
                          Pilih foto hasil perbaikan atau kondisi perangkat
                          setelah ditangani
                        </span>
                      </>
                    )}

                    <span className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                      JPG, PNG, WEBP · Maksimal 4 MB
                    </span>
                  </label>
                </div>

                {workflowMessage && (
                  <p
                    role="alert"
                    className="text-sm text-red-700"
                  >
                    {workflowMessage}
                  </p>
                )}

                <button
                  type="button"
                  disabled={workflowBusy}
                  onClick={() => void submitWorkflow()}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {workflowBusy
                    ? "Menyimpan..."
                    : "Simpan Laporan Penanganan"}
                </button>
              </section>
            )}

            {/* RINGKASAN PENANGANAN */}
              {showWorklogSummary && (
                <section
                  className={`space-y-3 rounded-xl border p-4 ${
                    isNotResolvable
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-emerald-200 bg-emerald-50/40"
                  }`}
                >
                <h3 className="text-sm font-semibold text-slate-800">
                  Ringkasan penanganan
                </h3>

                {[
                  {
                    label: "Analisa awal",
                    value: ticket.initial_analysis,
                  },
                  {
                    label: "Penyebab masalah",
                    value: ticket.root_cause,
                  },
                  {
                    label: "Tindakan perbaikan",
                    value: ticket.corrective_action,
                  },
                  {
                    label: "Part diganti",
                    value: ticket.part_replaced
                      ? ticket.part_replaced_description
                      : "Tidak ada",
                  },
                  {
                    label: "Biaya",
                    value: `Rp ${Number(
                      ticket.component_cost ?? 0
                    ).toLocaleString("id-ID")}`,
                  },
                  {
                    label: "Hasil",
                    value: ticket.resolution_result,
                  },
                ].map((item) => (
                  <div key={item.label} className="text-sm">
                    <p className="font-medium text-slate-600">
                      {item.label}
                    </p>

                    <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">
                      {item.value || "-"}
                    </p>
                  </div>
                ))}

                {/* ALASAN DISELESAIKAN */}
                {ticket.resolution_result === "Selesai" && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-800">
                      Alasan Diselesaikan
                    </p>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-emerald-700">
                      {ticket.resolution_completed_reason ||
                        "Alasan belum tersedia."}
                    </p>
                  </div>
                )}

                {/* ALASAN TIDAK BISA DISELESAIKAN */}
                {ticket.resolution_result ===
                  "Tidak bisa diselesaikan" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-800">
                      Alasan tidak bisa diselesaikan
                    </p>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-red-700">
                      {ticket.resolution_reason ||
                        "Alasan belum tersedia."}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* BUKTI PENYELESAIAN YANG SUDAH TERSIMPAN */}
            {proofUrl && (
              <section className="rounded-xl border border-emerald-200 p-4">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Bukti penyelesaian
                  </h3>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setImagePreview({
                        src: proofUrl,
                        title: "Bukti Penyelesaian",
                      })
                    }
                    aria-label={`Perbesar bukti penyelesaian tiket ${ticket.id}`}
                    className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofUrl}
                      alt={`Bukti penyelesaian tiket ${ticket.id}`}
                      className="max-h-[320px] w-full object-contain transition duration-200 group-hover:scale-[1.01]"
                      loading="lazy"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/20">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-800 opacity-0 shadow-lg transition group-hover:opacity-100">
                        <ZoomIn size={17} />
                        Perbesar gambar
                      </span>
                    </div>
                  </button>

                  <p className="mt-2 text-xs text-slate-500">
                    Klik gambar untuk melihat ukuran penuh.
                  </p>
                </div>
              </section>
            )}

            {/* STATUS DAN PRIORITAS */}
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem
                icon={<CheckCircle2 size={18} />}
                label="Status saat ini"
                value={ticket.status}
              />

              <InfoItem
                icon={
                  ticket.priority === "Tinggi" ? (
                    <AlertTriangle size={18} />
                  ) : ticket.priority === "Medium" ? (
                    <Clock3 size={18} />
                  ) : (
                    <ShieldCheck size={18} />
                  )
                }
                label="Prioritas"
                value={ticket.priority ?? "Belum ditentukan"}
              />
            </div>

            {/* PERSETUJUAN TIKET */}
            {isPending && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  Tentukan prioritas
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  <PriorityOption
                    active={priority === "Rendah"}
                    title="Rendah"
                    description="Gangguan ringan; pekerjaan tetap berjalan."
                    onClick={() => setPriority("Rendah")}
                  />

                  <PriorityOption
                    active={priority === "Medium"}
                    title="Medium"
                    description="Menghambat sebagian pekerjaan atau pengguna."
                    onClick={() => setPriority("Medium")}
                  />

                  <PriorityOption
                    active={priority === "Tinggi"}
                    title="Tinggi"
                    description="Gangguan kritis; pekerjaan utama terhenti."
                    onClick={() => setPriority("Tinggi")}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onApprove(ticket.id, priority)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <CheckCircle2 size={18} />
                  Terima Tiket
                </button>
              </div>
            )}

            {/* MULAI PENGERJAAN */}
            {isNotStarted && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Tiket telah disetujui dan siap ditangani oleh tim IT.
                </p>

                <button
                  type="button"
                  onClick={handleStartWork}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Play size={18} />
                  Mulai Pengerjaan
                </button>
              </div>
            )}

            {/* SEDANG DIKERJAKAN */}
            {isInProgress && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <Wrench
                    size={19}
                    className="mt-0.5 text-blue-600"
                  />

                  <p className="text-sm leading-6 text-blue-800">
                    Tiket sedang ditangani. Lengkapi laporan penanganan
                    di atas untuk menyimpan analisa, tindakan, biaya,
                    hasil, dan bukti penyelesaian.
                  </p>
                </div>
              </div>
            )}

            {/* TIKET SELESAI */}
            {isCompleted && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 text-emerald-600"
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Tiket telah selesai
                  </p>

                  <p className="mt-1 text-sm leading-5 text-emerald-700">
                    Penanganan tiket ini telah ditandai selesai.
                  </p>
                </div>
              </div>
            )}

            {/* TIKET TIDAK BISA DISELESAIKAN */}
            {isNotResolvable && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Tiket tidak bisa diselesaikan
                  </p>

                  <p className="mt-1 text-sm leading-5 text-amber-700">
                    Penanganan tiket telah dihentikan dan tiket ditutup
                    berdasarkan alasan yang tercatat pada laporan penanganan.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* POPUP PREVIEW FOTO LAMPIRAN / BUKTI PENYELESAIAN */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${imagePreview.title.toLowerCase()}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setImagePreview(null);
            }
          }}
        >
          <div className="relative flex max-h-full w-full max-w-5xl flex-col">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  {imagePreview.title}
                </p>

                <p className="mt-1 text-xs text-slate-300">
                  Tiket {ticket.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setImagePreview(null)}
                aria-label="Tutup pratinjau gambar"
                className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview.src}
                alt={`${imagePreview.title} tiket ${ticket.id}`}
                className="max-h-[78vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>

        <p className="mt-1 break-words text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function PriorityOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: "Rendah" | "Medium" | "Tinggi";
  description: string;
  onClick: () => void;
}) {
  const tone =
    title === "Tinggi"
      ? {
          Icon: AlertTriangle,
          active: "border-red-400 bg-red-50 ring-2 ring-red-100",
          icon: "text-red-600",
        }
      : title === "Medium"
        ? {
            Icon: Clock3,
            active: "border-amber-400 bg-amber-50 ring-2 ring-amber-100",
            icon: "text-amber-600",
          }
        : {
            Icon: ShieldCheck,
            active: "border-blue-400 bg-blue-50 ring-2 ring-blue-100",
            icon: "text-blue-600",
          };

  const Icon = tone.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? tone.active
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon size={19} className={tone.icon} />

        <span className="text-sm font-semibold text-slate-800">
          {title}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        {description}
      </p>
    </button>
  );
}