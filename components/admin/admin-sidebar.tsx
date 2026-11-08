
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  History,
  Headset,
  Users,
  ChevronRight,
} from "lucide-react";

const navigation = [
  {
    label: "Home",
    href: "/admin/home",
    icon: LayoutDashboard,
  },
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
  { label: "Administrator · PIC", href: "/admin/administrators", icon: Users },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-[#172B4D] text-white">
      <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500">
          <Headset size={22} />
        </div>

        <div>
          <p className="text-sm font-semibold tracking-wide">
            IT SUPPORT
          </p>
          <p className="mt-1 text-xs text-slate-300">
           Ticket System
          </p>
        </div>
      </div>

      <div className="px-4 pt-7">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>

        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                  active
                    ? "bg-blue-600 font-medium text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} strokeWidth={1.8} />

                <span className="flex-1">{item.label}</span>

                {active && <ChevronRight size={16} />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-5">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs font-medium text-slate-200">
            IT Helpdesk
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Internal support management system
          </p>
        </div>
      </div>
    </aside>
  );
}