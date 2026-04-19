import { DeleteLedgerEntryButton } from "@/components/delete-ledger-entry-button";
import { formatCurrency, formatDate } from "@/lib/utils";

type LedgerRow = {
  id: string;
  created_at: string;
  description: string | null;
  type: "BAAKI" | "PAYMENT";
  amount: number;
  balance: number;
};

export function CustomerLedgerTable({
  rows,
  customerName,
  canDelete = true,
}: {
  rows: LedgerRow[];
  customerName: string;
  canDelete?: boolean;
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <div className="ledger-grid-actions grid min-w-[720px] gap-3 rounded-2xl bg-paper px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">
        <div>Date</div>
        <div>Description</div>
        <div className="text-right">Baaki</div>
        <div className="text-right">Payment</div>
        <div className="text-right">Balance</div>
        <div className="text-center">Actions</div>
      </div>

      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="ledger-grid-actions grid min-w-[720px] items-center gap-3 rounded-2xl border border-line bg-warm px-4 py-3"
          >
            <div className="text-sm text-ink/70">{formatDate(row.created_at)}</div>
            <div>
              <p className="text-sm font-medium text-ink">
                {row.description || (row.type === "BAAKI" ? "Goods taken" : "Payment made")}
              </p>
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
            <div className="text-center">
              <DeleteLedgerEntryButton
                entryId={row.id}
                customerName={customerName}
                canDelete={canDelete}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
