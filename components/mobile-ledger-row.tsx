import { DeleteLedgerEntryButton } from "@/components/delete-ledger-entry-button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export function MobileLedgerRow({
  row,
  customerName,
}: {
  row: {
    id: string;
    created_at: string;
    description: string | null;
    type: "BAAKI" | "PAYMENT";
    amount: number;
    balance: number;
  };
  customerName: string;
}) {
  const isBaaki = row.type === "BAAKI";

  return (
    <details className="group rounded-[22px] border border-line bg-paper/95 shadow-sm">
      <summary className="list-none cursor-pointer px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isBaaki
                    ? "bg-khata/10 text-khata"
                    : "bg-moss/10 text-moss",
                )}
              >
                {isBaaki ? "Baaki" : "Payment"}
              </span>
              <span className="text-[11px] text-ink/55">{formatDate(row.created_at)}</span>
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-medium text-ink">
              {row.description || (isBaaki ? "Goods taken" : "Payment received")}
            </p>
          </div>
          <div className="text-right">
            <p className={cn("text-base font-semibold", isBaaki ? "text-khata" : "text-moss")}>
              {formatCurrency(row.amount)}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink/45">
              Bal {formatCurrency(row.balance)}
            </p>
          </div>
        </div>
      </summary>
      <div className="border-t border-line px-3 py-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-warm px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">Date</p>
            <p className="mt-1 font-medium text-ink">{formatDate(row.created_at)}</p>
          </div>
          <div className="rounded-2xl bg-warm px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">Balance</p>
            <p className="mt-1 font-medium text-ink">{formatCurrency(row.balance)}</p>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-warm px-3 py-2 text-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">Description</p>
          <p className="mt-1 text-ink/75">
            {row.description || (isBaaki ? "Goods taken" : "Payment received")}
          </p>
        </div>
        <div className="mt-3 flex justify-end">
          <DeleteLedgerEntryButton entryId={row.id} customerName={customerName} />
        </div>
      </div>
    </details>
  );
}
