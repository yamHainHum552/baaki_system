"use client";

import Link from "next/link";
import { useState } from "react";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatDays } from "@/lib/utils";

interface CustomerItemProps {
  customer: {
    customer_id: string;
    customer_name: string;
    phone: string | null;
    address: string | null;
    balance: number;
    days_since_last_payment: number | null;
    risk_level: string | null;
  };
  isOwner: boolean;
}

export function CustomerItem({ customer, isOwner }: CustomerItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const details = [customer.phone, customer.address].filter(Boolean).join(" | ");

  async function copyPhone() {
    if (!customer.phone) {
      return;
    }

    try {
      await navigator.clipboard.writeText(customer.phone);
    } finally {
      setMenuOpen(false);
    }
  }

  return (
    <div className="soft-panel p-3 sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <Link
          href={`/customers/${customer.customer_id}`}
          className="min-w-0 flex-1"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-ink sm:text-xl">
                {customer.customer_name}
              </p>
              {customer.risk_level ? (
                <RiskBadge
                  level={customer.risk_level as "LOW" | "MEDIUM" | "HIGH"}
                  compact
                />
              ) : null}
            </div>
            <p className="mt-1.5 line-clamp-1 break-words text-xs text-ink/65 sm:text-sm">
              {details || "No extra details"}
            </p>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
              <div>
                <p
                  className={`text-lg font-semibold sm:text-2xl ${
                    customer.balance >= 1000 ? "text-khata" : "text-ink"
                  }`}
                >
                  {formatCurrency(customer.balance)}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-ink/45">
                  Current baaki
                </p>
              </div>
              <p className="text-right text-[11px] uppercase tracking-[0.14em] text-ink/45">
                Last pay
                <span className="mt-0.5 block text-xs font-medium normal-case tracking-normal text-ink/70">
                  {formatDays(customer.days_since_last_payment)}
                </span>
              </p>
            </div>
          </div>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition hover:bg-white sm:h-10 sm:w-10"
            aria-label="Customer actions"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6h.01M12 12h.01M12 18h.01"
              />
            </svg>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-11 z-20 w-40 rounded-2xl border border-line bg-white p-2 shadow-lg sm:top-12 sm:w-44">
              <Link
                href={`/customers/${customer.customer_id}`}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-warm"
                onClick={() => setMenuOpen(false)}
              >
                {isOwner ? "Open and manage" : "Open ledger"}
              </Link>
              {customer.phone ? (
                <button
                  type="button"
                  onClick={copyPhone}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink transition hover:bg-warm"
                >
                  Copy phone
                </button>
              ) : null}
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-warm"
                >
                  Call customer
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
