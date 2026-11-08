
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  UserRound,
  LogOut,
  LoaderCircle,
  Ticket,
  Clock3,
} from "lucide-react";

const pageInfo: Record<
  string,
  { title: string; description: string }
> = {
  "/admin/home": {
    title: "Dashboard",
    description: "Ringkasan operasional IT Support.",
  },
  "/admin/tickets": {
    title: "Ticketing",
    description: "Kelola dan pantau pengajuan kendala perangkat.",
  },
  "/admin/history": {
    title: "Ticket History",
    description: "Riwayat penyelesaian dan laporan tiket.",
  },
};

type PendingTicket = {
  ticket_number: string;
  reporter_name: string;
  division: string;
  issue: string;
  status: string;
  created_at: string;
};

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const [notifications, setNotifications] = useState<
    PendingTicket[]
  >([]);

  const [notificationOpen, setNotificationOpen] = useState(false);

  const page = pageInfo[pathname] ?? {
    title: "IT Support",
    description: "Ticketing System",
  };

  // Mengambil tiket yang masih menunggu persetujuan.
  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/tickets", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil notifikasi.");
        }

        const result: unknown = await response.json();

        if (
          !result ||
          typeof result !== "object" ||
          !("tickets" in result) ||
          !Array.isArray(result.tickets)
        ) {
          throw new Error("Format data notifikasi tidak sesuai.");
        }

        const pendingTickets = (
          result.tickets as PendingTicket[]
        ).filter(
          (ticket) =>
            ticket.status === "Menunggu persetujuan",
        );

        if (isMounted) {
          setNotifications(pendingTickets);
        }
      } catch (error) {
        console.error("Notification error:", error);
      } finally {
        if (isMounted) {
        }
      }
    }

    void loadNotifications();

    // Periksa kembali notifikasi setiap 30 detik.
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout gagal.");
      }

      setMenuOpen(false);
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("Tidak dapat logout. Silakan coba lagi.");
      setLoggingOut(false);
    }
  }

  function handleNotificationClick() {
    setNotificationOpen(false);
    router.push("/admin/tickets");
  }

  return (
    <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 sm:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#172B4D]">
          {page.title}
        </h1>

        <p className="mt-1 hidden text-sm text-slate-500 sm:block">
          {page.description}
        </p>
      </div>

      <div className="flex items-center gap-3">

        {/* NOTIFICATION */}
        {notifications.length > 0 && (
          <div className="relative">
            <button
              type="button"
              aria-label={`Notifikasi, ${notifications.length} tiket menunggu persetujuan`}
              aria-expanded={notificationOpen}
              onClick={() => {
                setNotificationOpen((open) => !open);
                setMenuOpen(false);
              }}
              className="relative rounded-lg p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Bell size={20} />

              <span className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white ring-2 ring-white">
                {notifications.length > 9
                  ? "9+"
                  : notifications.length}
              </span>
            </button>

            {notificationOpen && (
              <>
                {/* Overlay untuk menutup dropdown */}
                <button
                  type="button"
                  aria-label="Tutup notifikasi"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setNotificationOpen(false)}
                />

                <div className="absolute right-0 top-full z-50 mt-3 w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-[380px]">

                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Notifikasi
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {notifications.length} tiket menunggu persetujuan
                      </p>
                    </div>

                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                      {notifications.length} Baru
                    </span>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.map((ticket) => (
                      <button
                        key={ticket.ticket_number}
                        type="button"
                        onClick={handleNotificationClick}
                        className="flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                          <Ticket size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              Pengajuan tiket baru
                            </p>

                            <span className="mt-1 size-2 shrink-0 rounded-full bg-red-500" />
                          </div>

                          <p className="mt-1 text-xs font-medium text-blue-700">
                            {ticket.ticket_number}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-600">
                            {ticket.reporter_name} · {ticket.division}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {ticket.issue}
                          </p>

                          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-600">
                            <Clock3 size={12} />
                            Menunggu persetujuan
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNotificationClick}
                    className="w-full bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Lihat semua tiket
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        {/* ACCOUNT MENU */}
        <div className="relative">
          <button
            type="button"
            aria-label="Menu akun admin"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setNotificationOpen(false);
              setError("");
            }}
            className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-slate-50"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <UserRound size={19} />
            </span>

            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-slate-800">
                Admin
              </span>

              <span className="block text-xs text-slate-500">
                IT Support
              </span>
            </span>

            <ChevronDown
              size={16}
              className={`hidden text-slate-400 transition-transform sm:block ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">
                  Admin
                </p>

                <p className="text-xs text-slate-500">
                  IT Support Ticket System
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="px-3 py-2 text-xs text-red-600"
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <LogOut size={17} />
                )}

                {loggingOut
                  ? "Sedang keluar..."
                  : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
