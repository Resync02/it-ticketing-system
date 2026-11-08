
"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import AdminSidebar from "./admin-sidebar";
import AdminHeader from "./admin-header";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="absolute inset-y-0 left-0">
            <div className="relative h-full">
              <AdminSidebar />
              <button
                type="button"
                aria-label="Tutup navigasi"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-3 top-5 rounded-md p-2 text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-2 md:hidden">
          <button
            type="button"
            aria-label="Buka navigasi"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          >
            <Menu size={21} />
          </button>
          <span className="text-sm font-semibold text-[#172B4D]">
            IT Support
          </span>
        </div>

        <AdminHeader />

        <main className="flex-1 p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
