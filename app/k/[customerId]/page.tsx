import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function SharedLedgerPage({
  params,
  searchParams
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { customerId } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_customer_ledger", {
    p_customer_id: customerId,
    p_token: token
  });

  if (error || !data?.length) {
    notFound();
  }

  const rows = data.map((row: any) => ({
    ...row,
    amount: Number(row.amount),
    balance: Number(row.balance)
  }));

  return (
    <main className="page-shell">
      <SectionCard
        title={`${rows[0].customer_name} ko khata`}
        subtitle="Read-only shared ledger"
      >
        <div className="mb-4 rounded-3xl bg-paper px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Current total baaki</p>
          <p className="mt-2 text-3xl font-semibold text-khata">
            {formatCurrency(rows.at(-1)?.balance ?? 0)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="ledger-grid grid min-w-[620px] gap-3 rounded-2xl bg-paper px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">
            <div>Date</div>
            <div>Description</div>
            <div className="text-right">Baaki</div>
            <div className="text-right">Payment</div>
            <div className="text-right">Balance</div>
          </div>

          <div className="mt-2 space-y-2">
            {rows.map((row: any, index: number) => (
              <div
                key={`${row.created_at}-${index}`}
                className="ledger-grid grid min-w-[620px] items-center gap-3 rounded-2xl border border-line bg-warm px-4 py-3"
              >
                <div className="text-sm text-ink/70">{formatDate(row.created_at)}</div>
                <div className="text-sm font-medium text-ink">
                  {row.description || (row.type === "BAAKI" ? "Goods taken" : "Payment made")}
                </div>
                <div className="text-right text-sm font-semibold text-khata">
                  {row.type === "BAAKI" ? formatCurrency(row.amount) : "-"}
                </div>
                <div className="text-right text-sm font-semibold text-moss">
                  {row.type === "PAYMENT" ? formatCurrency(row.amount) : "-"}
                </div>
                <div className="text-right text-sm font-semibold text-ink">
                  {formatCurrency(row.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
