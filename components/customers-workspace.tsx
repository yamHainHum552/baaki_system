"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerItem } from "@/components/customer-item";
import { CustomerVoiceForm } from "@/components/customer-voice-form";
import { formatCurrency } from "@/lib/utils";

type CustomerListItem = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  days_since_last_payment: number | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | null;
};

type RecognitionWindow = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

export function CustomersWorkspace({
  customers,
  isOwner,
}: {
  customers: CustomerListItem[];
  isOwner: boolean;
}) {
  const [query, setQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchListening, setSearchListening] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return customers;
    }

    return [...customers]
      .map((customer) => ({
        customer,
        score: getCustomerSearchScore(customer, term),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.customer);
  }, [customers, query]);

  const totalDue = useMemo(
    () => filteredCustomers.reduce((sum, customer) => sum + customer.balance, 0),
    [filteredCustomers],
  );

  function startVoiceSearch() {
    const recognitionWindow = window as RecognitionWindow;
    const Recognition =
      recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSearchMessage("Voice search is not supported on this device.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-NP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setSearchListening(true);
      setSearchMessage("Listening for customer search...");
    };

    recognition.onend = () => {
      setSearchListening(false);
    };

    recognition.onerror = () => {
      setSearchListening(false);
      setSearchMessage("Could not capture voice search. Please try again.");
    };

    recognition.onresult = (event: any) => {
      const spoken = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      setQuery(spoken);
      setSearchMessage(`Showing results for "${spoken}".`);
    };

    recognition.start();
  }

  return (
    <div className="section-spacing">
      <section className="surface-panel p-3.5 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition hover:bg-white"
            aria-label="Back to dashboard"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata">
              Customers
            </p>
            <h1 className="mt-1 font-serif text-xl text-ink sm:text-3xl">
              Customer list
            </h1>
          </div>

          {isOwner ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-khata text-white shadow-sm transition hover:bg-khata/90"
              aria-label="Add customer"
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
                  d="M12 5v14m-7-7h14"
                />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (searchMessage) {
                  setSearchMessage("");
                }
              }}
              placeholder="Search by name, phone, address, due, or risk"
              className="pr-12"
            />
            <button
              type="button"
              onClick={startVoiceSearch}
              disabled={searchListening}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-white disabled:opacity-60"
              aria-label="Voice search customers"
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
                  d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm0 13v5m-5-5a5 5 0 0010 0"
                />
              </svg>
            </button>
          </div>

          <div className="soft-panel flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="text-ink/65">
              {filteredCustomers.length} result{filteredCustomers.length === 1 ? "" : "s"}
            </span>
            <span className="font-semibold text-khata">
              {formatCurrency(totalDue)}
            </span>
          </div>
        </div>

        {searchMessage ? (
          <p className="mt-3 text-sm text-ink/65">{searchMessage}</p>
        ) : null}
      </section>

      <section className="surface-panel p-2.5 sm:p-4">
        <div className="space-y-2.5">
          {filteredCustomers.length ? (
            filteredCustomers.map((customer) => (
              <CustomerItem
                key={customer.customer_id}
                customer={customer}
                isOwner={isOwner}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-line bg-paper px-4 py-10 text-center text-sm text-ink/65">
              No customer matched that search.
            </div>
          )}
        </div>
      </section>

      {isOwner && isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-line bg-paper p-4 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata">
                  Add customer
                </p>
                <h2 className="mt-2 font-serif text-xl text-ink sm:text-2xl">
                  New customer khata
                </h2>
                <p className="mt-2 text-sm text-ink/65">
                  Speak or type the details, then save once.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition hover:bg-white"
                aria-label="Close add customer modal"
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

            <div className="mt-5 max-h-[75vh] overflow-y-auto pr-1">
              <CustomerVoiceForm
                compact
                onSaved={() => {
                  setIsModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getCustomerSearchScore(customer: CustomerListItem, term: string) {
  const tokens = term.split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return 1;
  }

  const name = customer.customer_name.toLowerCase();
  const phone = (customer.phone ?? "").toLowerCase();
  const address = (customer.address ?? "").toLowerCase();
  const risk = (customer.risk_level ?? "").toLowerCase();
  const balance = String(Math.round(customer.balance));

  let score = 0;

  for (const token of tokens) {
    if (name.startsWith(token)) {
      score += 10;
      continue;
    }

    if (name.includes(token)) {
      score += 7;
      continue;
    }

    if (phone.includes(token)) {
      score += 6;
      continue;
    }

    if (address.includes(token)) {
      score += 5;
      continue;
    }

    if (risk.includes(token)) {
      score += 4;
      continue;
    }

    if (balance.includes(token)) {
      score += 3;
      continue;
    }

    return 0;
  }

  return score;
}
