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
    <div className="surface-panel p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/customers" className="text-sm font-semibold text-khata">
                Back to customers
              </Link>
              <div className="flex w-full justify-start sm:w-auto sm:justify-end">
                {actions}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-[2rem] leading-none text-ink sm:text-[3rem]">
                {customerName}
              </h1>
              {riskLevel ? <RiskBadge level={riskLevel} compact /> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/68 sm:text-[15px]">
              {customerPhone ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-moss/70" />
                  {customerPhone}
                </span>
              ) : null}
              {customerAddress ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-khata/70" />
                  {customerAddress}
                </span>
              ) : null}
              {!customerPhone && !customerAddress ? (
                <span className="text-ink/55">Khata ledger</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_0.9fr]">
          <div className="soft-panel px-3.5 py-3.5 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
              Current baaki
            </p>
            <p className="mt-2 text-2xl font-semibold text-khata sm:text-[2rem]">
              {formatCurrency(currentBalance)}
            </p>
          </div>

          <div className="soft-panel px-3.5 py-3.5 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
              Last payment
            </p>
            <p className="mt-2 text-sm font-semibold text-ink sm:text-[15px]">
              {lastPaymentDate ? formatLongDate(lastPaymentDate) : "No payment yet"}
            </p>
          </div>

          <div className="soft-panel px-3.5 py-3.5 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
              Days since payment
            </p>
            <p className="mt-2 text-sm font-semibold text-moss sm:text-[15px]">
              {formatDays(daysSinceLastPayment)}
            </p>
          </div>

          <div className="soft-panel px-3.5 py-3.5 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
              Risk status
            </p>
            <p className="mt-2 text-sm font-semibold text-ink sm:text-[15px]">
              {riskLevel ?? "Unknown"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
