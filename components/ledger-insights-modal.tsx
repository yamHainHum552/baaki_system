"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type LedgerInsightsModalProps = {
  lastPaymentLabel: string;
  daysSincePaymentLabel: string;
  paymentFrequencyLabel: string;
  riskScoreLabel: string;
};

export function LedgerInsightsModal({
  lastPaymentLabel,
  daysSincePaymentLabel,
  paymentFrequencyLabel,
  riskScoreLabel,
}: LedgerInsightsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="button-secondary w-full sm:w-auto"
      >
        Ledger insights
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-line bg-paper p-4 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata">
                  Ledger insights
                </p>
                <h2 className="mt-2 font-serif text-xl text-ink sm:text-2xl">
                  Customer payment signals
                </h2>
                <p className="mt-1.5 text-sm text-ink/65">
                  Simple insights derived from the same khata entries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition hover:bg-white"
                aria-label="Close ledger insights"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <InsightTile
                icon={insightIcon("calendar")}
                tone="text-khata"
                label="Last payment"
                value={lastPaymentLabel}
              />
              <InsightTile
                icon={insightIcon("clock")}
                tone="text-moss"
                label="Days since payment"
                value={daysSincePaymentLabel}
              />
              <InsightTile
                icon={insightIcon("rhythm")}
                tone="text-ink"
                label="Payment frequency"
                value={paymentFrequencyLabel}
              />
              <InsightTile
                icon={insightIcon("risk")}
                tone="text-khata"
                label="Risk score"
                value={riskScoreLabel}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InsightTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="soft-panel flex items-start gap-3 px-3 py-3 sm:px-4 sm:py-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ${tone}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-ink/50">
          {label}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function insightIcon(kind: "calendar" | "clock" | "rhythm" | "risk") {
  if (kind === "calendar") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  if (kind === "clock") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (kind === "rhythm") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 13h4l2-6 4 12 2-6h4" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86l-7.3 12.65A2 2 0 004.71 19h14.58a2 2 0 001.72-2.49l-7.3-12.65a2 2 0 00-3.42 0z" />
    </svg>
  );
}
