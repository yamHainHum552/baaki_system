import type { ReactNode } from "react";
import Link from "next/link";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatDays, formatLongDate } from "@/lib/utils";

export function CustomerLedgerHeader({
  customerName,
  customerPhone,
  customerAddress,
  currentBalance,
  riskLevel,
  lastPaymentDate,
  daysSinceLastPayment,
  actions,
}: {
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  currentBalance: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  lastPaymentDate: string | null;
  daysSinceLastPayment: number | null;
  actions: ReactNode;
}) {
  return (
    <div className="surface-panel p-4 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <Link href="/customers" className="text-sm font-semibold text-khata">
            Back to customers
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl text-ink sm:text-4xl">{customerName}</h1>
            {riskLevel ? <RiskBadge level={riskLevel} compact /> : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="soft-panel px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">Current baaki</p>
              <p className="mt-1 text-2xl font-semibold text-khata sm:text-3xl">
                {formatCurrency(currentBalance)}
              </p>
            </div>
            <div className="soft-panel px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">Last payment</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {lastPaymentDate ? formatLongDate(lastPaymentDate) : "No payment yet"}
              </p>
              <p className="mt-1 text-xs text-ink/60">{formatDays(daysSinceLastPayment)}</p>
            </div>
          </div>
          <details className="mt-3 rounded-2xl border border-line bg-paper md:hidden">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-ink">
              View customer details
            </summary>
            <div className="border-t border-line px-3 py-3 text-sm text-ink/70">
              {customerPhone || customerAddress || "Khata ledger"}
            </div>
          </details>
          <p className="mt-2 hidden text-sm text-ink/65 md:block md:text-base">
            {customerPhone || customerAddress || "Khata ledger"}
          </p>
        </div>

        <div
          id="customer-actions"
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[340px]"
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
