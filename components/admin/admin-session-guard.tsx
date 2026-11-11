"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TAB_SESSION_KEY = "wg_admin_tab_session";

type AdminSessionGuardProps = {
  children: React.ReactNode;
};

export default function AdminSessionGuard({
  children,
}: AdminSessionGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    let hasTabSession = false;

    try {
      hasTabSession =
        window.sessionStorage.getItem(TAB_SESSION_KEY) === "active";
    } catch {
      hasTabSession = false;
    }

    if (hasTabSession) {
      setAllowed(true);
      return () => {
        isMounted = false;
      };
    }

    // Tidak ada penanda pada tab ini: hapus cookie server agar tab baru
    // tidak dapat memakai sesi lama yang masih tersimpan di browser.
    try {
      window.sessionStorage.removeItem(TAB_SESSION_KEY);
    } catch {
      // Redirect tetap dilakukan meskipun storage browser tidak tersedia.
    }

    async function rejectTabSession() {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        });
      } catch {
        // Keputusan akses tetap ditolak meskipun request logout gagal.
      } finally {
        if (isMounted) {
          router.replace("/admin/login");
          router.refresh();
        }
      }
    }

    void rejectTabSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="mt-4 text-sm text-slate-500">
            Memeriksa sesi administrator...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}