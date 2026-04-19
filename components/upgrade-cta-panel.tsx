"use client";

import { useState } from "react";
import { PremiumBadge } from "@/components/premium-badge";
import { formatUsageLimit } from "@/lib/utils";

export function UpgradeCtaPanel({
  allowTrial,
  onStartTrial,
  onRequestPremium,
  featurePreview,
  limits,
}: {
  allowTrial: boolean;
  onStartTrial?: () => void;
  onRequestPremium?: () => void;
  featurePreview: string[];
  limits: {
    customers: number;
    staff: number;
    exports: number;
    shareLinks: number;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="button-primary w-full sm:w-auto"
      >
        Upgrade to Premium
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-3xl rounded-[32px] border border-line bg-paper p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata">
                  Premium plans
                </p>
                <h3 className="mt-2 font-serif text-3xl text-ink">
                  Unlock faster store operations
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-ink/70">
                  Premium keeps the khata simple while unlocking higher limits,
                  reports, forecasts, share links, and reminders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition hover:bg-white"
                aria-label="Close upgrade plans"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="soft-panel p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Free
                </p>
                <h4 className="mt-2 font-serif text-2xl text-ink">Start and grow</h4>
                <div className="mt-4 space-y-2 text-sm text-ink/70">
                  <p>{formatUsageLimit(limits.customers)} customers</p>
                  <p>{formatUsageLimit(limits.staff)} staff</p>
                  <p>{formatUsageLimit(limits.exports)} exports / month</p>
                  <p>{formatUsageLimit(limits.shareLinks)} share links / month</p>
                </div>
              </div>

              <div className="surface-panel p-5">
                <div className="flex items-center justify-between">
                  <PremiumBadge />
                  <p className="text-xs uppercase tracking-[0.16em] text-khata">Recommended</p>
                </div>
                <h4 className="mt-3 font-serif text-2xl text-ink">Premium</h4>
                <div className="mt-4 space-y-2 text-sm text-ink/70">
                  {featurePreview.map((feature) => (
                    <p key={feature}>{feature}</p>
                  ))}
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {allowTrial && onStartTrial ? (
                    <button type="button" onClick={onStartTrial} className="button-secondary">
                      Start Free Trial
                    </button>
                  ) : null}
                  {onRequestPremium ? (
                    <button type="button" onClick={onRequestPremium} className="button-primary">
                      Contact for Premium
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
