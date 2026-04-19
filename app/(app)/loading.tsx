import { BaakiLoader } from "@/components/baaki-loader";

export default function AppLoading() {
  return (
    <main className="page-shell">
      <div className="surface-panel flex min-h-[60vh] items-center justify-center p-6 sm:p-10">
        <BaakiLoader
          label="Opening your khata"
          detail="Loading dashboard, customers, and store data..."
        />
      </div>
    </main>
  );
}
