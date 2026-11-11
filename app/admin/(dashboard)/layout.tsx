import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/admin-shell";
import AdminSessionGuard from "@/components/admin/admin-session-guard";
import { getAdminSession } from "@/lib/auth";

async function ProtectedDashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminSessionGuard>
      <AdminShell>{children}</AdminShell>
    </AdminSessionGuard>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Memeriksa sesi admin...
        </div>
      }
    >
      <ProtectedDashboard>{children}</ProtectedDashboard>
    </Suspense>
  );
}
