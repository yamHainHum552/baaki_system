"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

export function PremiumRequestForm({
  action,
  defaultPhone,
  requestStatus
}: {
  action: (formData: FormData) => Promise<void>;
  defaultPhone: string;
  requestStatus: string | null;
}) {
  const [isOpen, setIsOpen] = useState(requestStatus === "PENDING");

  return (
    <div className="rounded-[28px] border border-line bg-warm p-5 shadow-ledger">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-khata">Premium</p>
          <h3 className="mt-2 font-serif text-2xl text-ink">Upgrade flow kept simple</h3>
          <p className="mt-2 text-sm text-ink/70">
            Free stores can start immediately. When you need analytics, SMS reminders, and unlimited customers,
            send one Premium request from here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="button-secondary"
        >
          {isOpen ? "Hide" : "Request"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-paper px-4 py-4 text-sm">
          <p className="font-semibold text-ink">Free</p>
          <p className="mt-1 text-ink/65">Up to 50 customers, full khata, payments, and ledger history.</p>
        </div>
        <div className="rounded-2xl bg-paper px-4 py-4 text-sm">
          <p className="font-semibold text-ink">Premium</p>
          <p className="mt-1 text-ink/65">Unlimited customers, SMS reminders, richer analytics, and priority help.</p>
        </div>
      </div>

      {requestStatus === "PENDING" ? (
        <p className="mt-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
          Premium request already sent. We can review and activate this store without changing your khata data.
        </p>
      ) : null}

      {isOpen ? (
        <form
          action={action}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Contact phone</label>
            <input
              name="contact_phone"
              defaultValue={defaultPhone}
              placeholder="98XXXXXXXX"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Need SMS reminder and unlimited customers"
            />
          </div>
          <SubmitButton
            idle="Send Premium request"
            pending="Sending..."
            className="button-primary"
          />
        </form>
      ) : null}
    </div>
  );
}
