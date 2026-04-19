import { AppShellHeader } from "@/components/app-shell-header";
import { requireStoreContext } from "@/lib/auth";

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { store } = await requireStoreContext();

  return (
    <main className="page-shell">
      <AppShellHeader store={store} />
      <div className="mt-6">{children}</div>
    </main>
  );
}
