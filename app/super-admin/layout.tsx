import { SuperAdminHeader } from "@/components/super-admin-header";
import { requireAdminAccess } from "@/lib/admin";

export default async function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await requireAdminAccess();

  return (
    <main className="page-shell max-w-[1480px]">
      <SuperAdminHeader role={admin.adminRole} fullName={admin.fullName} />
      <div className="mt-5">{children}</div>
    </main>
  );
}
