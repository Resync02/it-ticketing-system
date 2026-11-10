
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  UserRoundPlus,
  Users,
  Power,
  RefreshCw,
} from "lucide-react";

type PIC = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: number;
};

type PICResponse = {
  pics?: PIC[];
  error?: string;
};

export default function AdministratorsPage() {
  // =========================================
  // STATE
  // =========================================

  const [pics, setPics] = useState<PIC[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // =========================================
  // INITIAL FETCH
  // =========================================

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin/pics", {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as PICResponse;

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal memuat data PIC."
          );
        }

        return result;
      })
      .then((result) => {
        if (isMounted) {
          setPics(
            Array.isArray(result.pics) ? result.pics : []
          );
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memuat PIC."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // =========================================
  // MEMUAT ULANG DATA
  // =========================================

  async function loadPics() {
    setError("");

    try {
      const response = await fetch("/api/admin/pics", {
        cache: "no-store",
      });

      const result = (await response.json()) as PICResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal memuat data PIC."
        );
      }

      setPics(Array.isArray(result.pics) ? result.pics : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data PIC."
      );
    }
  }

  // =========================================
  // TAMBAH PIC
  // =========================================

  async function addPIC(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Nama PIC wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/pics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      const result = (await response.json()) as PICResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal menyimpan PIC."
        );
      }

      setName("");
      setEmail("");
      setPhone("");

      await loadPics();

      setSuccess("PIC berhasil ditambahkan.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan PIC."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // =========================================
  // AKTIFKAN / NONAKTIFKAN PIC
  // =========================================

  async function togglePIC(id: number) {
    setTogglingId(id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/pics", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action: "toggle",
        }),
      });

      const result = (await response.json()) as PICResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal mengubah status PIC."
        );
      }

      await loadPics();

      setSuccess("Status PIC berhasil diperbarui.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status PIC."
      );
    } finally {
      setTogglingId(null);
    }
  }

  // =========================================
  // TAMPILAN
  // =========================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Pengaturan
        </p>

        <h1 className="text-2xl font-semibold text-[#172B4D] sm:text-3xl">
          Administrator · PIC
        </h1>

        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Kelola person in charge yang dapat ditugaskan
          untuk menangani tiket IT.
        </p>
      </header>

      {/* NOTIFIKASI */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* FORM TAMBAH PIC */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
            <UserRoundPlus size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-[#172B4D]">
              Tambah PIC
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Masukkan informasi person in charge baru.
            </p>
          </div>
        </div>

        <form onSubmit={addPIC} className="space-y-4">

          {/* NAMA */}
          <div className="space-y-1.5">
            <label
              htmlFor="pic-name"
              className="text-sm font-medium text-slate-700"
            >
              Nama PIC <span className="text-red-500">*</span>
            </label>

            <input
              id="pic-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masukkan nama PIC"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-1.5">
            <label
              htmlFor="pic-email"
              className="text-sm font-medium text-slate-700"
            >
              Email
              <span className="ml-1 font-normal text-slate-400">
                (Opsional)
              </span>
            </label>

            <input
              id="pic-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@wiragriya.co.id"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* TELEPON */}
          <div className="space-y-1.5">
            <label
              htmlFor="pic-phone"
              className="text-sm font-medium text-slate-700"
            >
              Nomor Telepon
              <span className="ml-1 font-normal text-slate-400">
                (Opsional)
              </span>
            </label>

            <input
              id="pic-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserRoundPlus size={17} />

            {isSaving ? "Menyimpan..." : "Tambah PIC"}
          </button>
        </form>
      </section>

      {/* DAFTAR PIC */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        {/* HEADER DAFTAR */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
              <Users size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-[#172B4D]">
                Daftar PIC
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Total {pics.length} person in charge
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccess("");
              void loadPics();
            }}
            disabled={isLoading}
            aria-label="Refresh daftar PIC"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={isLoading ? "animate-spin" : ""}
            />

            Refresh
          </button>
        </div>

        {/* ISI DAFTAR */}
        <div className="divide-y divide-slate-100">

          {isLoading && (
            <div className="p-8 text-center text-sm text-slate-500">
              Memuat daftar PIC...
            </div>
          )}

          {!isLoading && pics.length === 0 && (
            <div className="p-8 text-center">
              <Users
                size={30}
                className="mx-auto mb-3 text-slate-300"
              />

              <p className="text-sm font-medium text-slate-600">
                Belum ada PIC
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Tambahkan PIC melalui formulir di atas.
              </p>
            </div>
          )}

          {!isLoading &&
            pics.map((pic) => (
              <div
                key={pic.id}
                className="flex flex-col gap-4 p-5"
              >
                {/* INFORMASI PIC */}
                <div className="min-w-0">
                  <p className="break-words font-semibold text-[#172B4D]">
                    {pic.name}
                  </p>

                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <p className="break-all">
                      {pic.email || "Tanpa email"}
                    </p>

                    <p>
                      {pic.phone || "Tanpa nomor telepon"}
                    </p>
                  </div>
                </div>

                {/* STATUS DAN AKSI */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      pic.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pic.is_active ? "Aktif" : "Nonaktif"}
                  </span>

                  <button
                    type="button"
                    disabled={togglingId !== null}
                    onClick={() => void togglePIC(pic.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      pic.is_active
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <Power size={14} />

                    {togglingId === pic.id
                      ? "Memproses..."
                      : pic.is_active
                        ? "Nonaktifkan"
                        : "Aktifkan"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}