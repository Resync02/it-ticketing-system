"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Send,
  Ticket,
} from "lucide-react";

const divisions = [
  "Management",
  "Business Development",
  "Engineering",
  "Production & Maintenance",
  "Logistic",
  "Purchasing",
  "Finance",
  "Accounting & Tax",
  "HRGA",
];

const locations = ["Cakung", "Pusat"];

const problemCategories = [
  "Hardware/Perangkat",
  "Software/Aplikasi",
  "CCTV",
  "Access",
  "Konektivitas",
  "ERP",
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

type TicketResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    ticket_number?: string;
    status?: string;
    has_photo?: boolean;
  };
};

export default function ClientTicketPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [division, setDivision] = useState("");
  const [location, setLocation] = useState("");
  const [device, setDevice] = useState("");
  const [previous, setPrevious] = useState("");
  const [issue, setIssue] = useState("");
  const [impact, setImpact] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setTicketNumber("");

    // Validasi seluruh field wajib
    if (
      !name.trim() ||
      !phone.trim() ||
      !division ||
      !location ||
      !device ||
      !previous ||
      !issue.trim() ||
      !impact.trim()
    ) {
      setError("Mohon lengkapi seluruh kolom wajib.");
      return;
    }

    // Validasi nomor telepon / WhatsApp.
    const phoneDigits = phone.replace(/\D/g, "");
    if (
      !/^\+?[0-9][0-9\s().-]*$/.test(phone.trim()) ||
      phoneDigits.length < 9 ||
      phoneDigits.length > 15
    ) {
      setError("Nomor telepon / WhatsApp tidak valid. Gunakan 9–15 digit, misalnya 081234567890.");
      return;
    }

    // Validasi konfirmasi laporan
    if (!confirmed) {
      setError(
        "Anda harus mengonfirmasi kebenaran laporan sebelum mengirim."
      );
      return;
    }

    // Validasi foto wajib
    if (!photo) {
      setError("Foto atau screenshot kendala wajib diunggah.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(photo.type)) {
      setError("Foto harus berformat JPG, PNG, atau WEBP.");
      return;
    }

    if (photo.size === 0 || photo.size > MAX_PHOTO_SIZE) {
      setError("Ukuran foto harus lebih dari 0 dan maksimal 4 MB.");
      return;
    }

    setSubmitting(true);

    try {
      // Membuat FormData
      const formData = new FormData();

      formData.set("reporter_name", name.trim());
      formData.set("reporter_phone", phone.trim());
      formData.set("division", division);
      formData.set("location", location);
      formData.set("device", device);
      formData.set("previous_occurrence", previous);
      formData.set("issue", issue.trim());
      formData.set("impact", impact.trim());
      formData.set("confirmed", "yes");

      if (photo) {
        formData.set("photo", photo);
      }

      // Mengirim laporan ke API
      const response = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      // Membaca respons sebagai teks terlebih dahulu
      const responseText = await response.text();

      let result: TicketResponse;

      try {
        result = JSON.parse(responseText) as TicketResponse;
      } catch {
        throw new Error(
          `Respons server tidak valid (HTTP ${response.status}). ${
            responseText || "Respons kosong."
          }`
        );
      }

      // Memeriksa hasil respons API
      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Gagal membuat tiket."
        );
      }

      // Memastikan nomor tiket diterima
      const newTicketNumber = result.data?.ticket_number;

      if (!newTicketNumber) {
        throw new Error(
          "Tiket mungkin sudah tersimpan, tetapi nomor tiket tidak diterima dari server. Periksa daftar tiket sebelum mengirim ulang."
        );
      }

      // Menampilkan konfirmasi keberhasilan
      setTicketNumber(newTicketNumber);

      // Mengosongkan formulir setelah berhasil
      setName("");
      setPhone("");
      setDivision("");
      setLocation("");
      setDevice("");
      setPrevious("");
      setIssue("");
      setImpact("");
      setPhoto(null);
      setConfirmed(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengirim laporan."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <header className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
            <Ticket size={25} />
          </div>

          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            IT Ticket System
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Formulir Laporan IT
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Laporkan kendala perangkat atau layanan IT kepada tim IT
            Support. Isi informasi dengan jelas agar penanganan lebih cepat.
          </p>
        </header>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          {/* Nama */}
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="name"
            >
              Nama *
            </label>

            <input
              id="name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={150}
              required
              placeholder="Nama lengkap"
            />
          </div>

          {/* Nomor Telepon / WhatsApp */}
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="phone"
            >
              Nomor Telepon / WhatsApp *
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              required
              placeholder="Contoh: 081234567890 atau +6281234567890"
              aria-describedby="phone-help"
            />
            <p id="phone-help" className="mt-1.5 text-xs text-slate-500">
              Gunakan nomor aktif yang dapat dihubungi tim IT (9–15 digit).
            </p>
          </div>

          {/* Divisi dan Lokasi */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                className="text-sm font-semibold text-slate-800"
                htmlFor="division"
              >
                Divisi *
              </label>

              <select
                id="division"
                className={inputClass}
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                required
              >
                <option value="">Pilih divisi</option>

                {divisions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="text-sm font-semibold text-slate-800"
                htmlFor="location"
              >
                Lokasi *
              </label>

              <select
                id="location"
                className={inputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              >
                <option value="">Pilih lokasi</option>

                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Perangkat */}
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="device"
            >
              Permasalahan *
            </label>

            <select
              id="device"
              className={inputClass}
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              required
            >
              <option value="">Pilih jenis permasalahan</option>

              {problemCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Kendala */}
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="issue"
            >
              Kendala yang Dialami *
            </label>

            <textarea
              id="issue"
              className={inputClass}
              rows={4}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              maxLength={10000}
              required
              placeholder="Jelaskan kendala, pesan error, kapan mulai terjadi, dan langkah yang sudah dicoba."
            />
          </div>

          {/* Riwayat Kendala */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">
              Pernah terjadi sebelumnya? *
            </legend>

            <div className="mt-3 flex flex-wrap gap-5">
              {["Pernah", "Belum", "Tidak Tahu"].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name="previous"
                    value={item}
                    checked={previous === item}
                    onChange={() => setPrevious(item)}
                    required
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Dampak */}
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="impact"
            >
              Dampak Terhadap Pekerjaan *
            </label>

            <textarea
              id="impact"
              className={inputClass}
              rows={3}
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              maxLength={10000}
              required
              placeholder="Jelaskan dampaknya terhadap pekerjaan, jumlah pengguna terdampak, atau proses yang terhenti."
            />
          </div>

{/* Foto */}
<div>
  <p className="text-sm font-semibold text-slate-800">
    Foto / Screenshot Kendala *
  </p>

  <label
    htmlFor="photo"
    className="mt-2 flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50/60 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
  >
    <input
      ref={fileInputRef}
      id="photo"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
      className="sr-only"
      required
    />

    {photo ? (
      <>
        <span className="max-w-full break-all text-sm font-semibold text-slate-800">
          {photo.name}
        </span>
        <span className="mt-1 text-xs text-blue-700">
          Gambar dipilih · Klik area ini untuk mengganti
        </span>
      </>
    ) : (
      <>
        <span className="text-sm font-semibold text-slate-800">
          Klik untuk upload gambar
        </span>
        <span className="mt-1 text-xs text-slate-500">
          Pilih foto atau screenshot kendala dari perangkat Anda
        </span>
      </>
    )}

    <span className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
      JPG, PNG, WEBP · Maksimal 4 MB
    </span>
  </label>
</div>

          {/* Konfirmasi */}
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />

            <span>
              Saya menyatakan informasi laporan ini benar sesuai kondisi
              yang saya alami dan bersedia dihubungi tim IT untuk proses
              pemeriksaan.
            </span>
          </label>

          {/* Informasi waktu */}
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <CalendarClock
              className="mt-0.5 text-slate-500"
              size={20}
            />

            <p className="text-xs leading-5 text-slate-500">
              Tanggal dan waktu pengajuan dicatat otomatis.
            </p>
          </div>

          {/* Pesan error */}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          {/* Pesan berhasil */}
          {ticketNumber && (
            <div
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 p-4"
            >
              <div className="flex gap-3">
                <CheckCircle2 className="text-green-700" />

                <div>
                  <p className="font-semibold text-green-900">
                    Laporan berhasil dikirim
                  </p>

                  <p className="mt-1 text-sm text-green-800">
                    Nomor tiket: <strong>{ticketNumber}</strong>
                  </p>

                  <p className="mt-1 text-xs text-green-800">
                    Status: Menunggu persetujuan tim IT.
                  </p>
                  <Link
                    href="/client/tracking"
                    className="mt-3 inline-flex items-center rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-800"
                  >
                    Lacak Status Tiket
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Tombol submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={17} />

            {submitting ? "Mengirim laporan..." : "Kirim Laporan"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Kolom bertanda * wajib diisi.
          </p>
        </form>

        <footer className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-slate-500">
          <span>IT Support Ticketing System</span>
          <Link
            href="/client/tracking"
            className="font-medium text-blue-700 hover:text-blue-800"
          >
            Lacak status tiket yang sudah dikirim
          </Link>
        </footer>
      </div>
    </main>
  );
}