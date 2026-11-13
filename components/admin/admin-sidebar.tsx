"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  History,
  Headset,
  Users,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

const ticketingNavigation = [
  {
    label: "Ticketing",
    href: "/admin/tickets",
    icon: Ticket,
  },
  {
    label: "History",
    href: "/admin/history",
    icon: History,
  },
  {
    label: "Administrator · PIC",
    href: "/admin/administrators",
    icon: Users,
  },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const isTicketingActive = ticketingNavigation.some((item) =>
    isPathActive(pathname, item.href),
  );
  const [ticketingOpen, setTicketingOpen] = useState(isTicketingActive);

  // Buka dropdown otomatis saat pengguna masuk ke salah satu halaman Ticketing.
  useEffect(() => {
    if (isTicketingActive) {
      setTicketingOpen(true);
    }
  }, [isTicketingActive]);

  const homeActive = isPathActive(pathname, "/admin/home");

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-[#172B4D] text-white">
      <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500">
          <Headset size={22} />
        </div>

        <div>
          <p className="text-sm font-semibold tracking-wide">IT SUPPORT</p>
          <p className="mt-1 text-xs text-slate-300">Ticket System</p>
        </div>
      </div>

      <div className="px-4 pt-7">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>

        <nav className="space-y-1.5" aria-label="Navigasi admin">
          <Link
            href="/admin/home"
            aria-current={homeActive ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
              homeActive
                ? "bg-blue-600 font-medium text-white shadow-sm"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <LayoutDashboard size={19} strokeWidth={1.8} />
            <span className="flex-1">Home</span>
            {homeActive && <ChevronRight size={16} />}
          </Link>

          <div>
            <button
              type="button"
              aria-expanded={ticketingOpen}
              aria-controls="ticketing-submenu"
              onClick={() => setTicketingOpen((open) => !open)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${
                isTicketingActive
                  ? "bg-blue-600 font-medium text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Ticket size={19} strokeWidth={1.8} />
              <span className="flex-1">Ticketing</span>
              <ChevronDown
                size={17}
                className={`transition-transform duration-200 ${ticketingOpen ? "rotate-180" : ""}`}
              />
            </button>

            {ticketingOpen && (
              <div
                id="ticketing-submenu"
                className="ml-4 mt-1 space-y-1 border-l border-white/15 pl-3"
              >
                {ticketingNavigation.map((item) => {
                  const active = isPathActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-white/15 font-medium text-white"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight size={15} />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-5">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs font-medium text-slate-200">IT Helpdesk</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Internal support management system
          </p>
        </div>
      </div>
    </aside>
  );
}