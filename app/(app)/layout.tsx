import { AppShellHeader } from "@/components/app-shell-header";
import { StoreContextProvider } from "@/components/store-context-provider";
import { requireStoreContext } from "@/lib/auth";

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { store } = await requireStoreContext();

  return (
    <main className="page-shell">
      <StoreContextProvider store={store}>
        <AppShellHeader store={store} />
        <div className="mt-6">{children}</div>
      </StoreContextProvider>
    </main>
  );
}
