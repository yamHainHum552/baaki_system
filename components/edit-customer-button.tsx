"use client";

import { useState, type FormEvent } from "react";
import { deleteCustomerAction, updateCustomerAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { useToast } from "@/components/toast-provider";

interface EditCustomerButtonProps {
  customerId: string;
  customerName: string;
  phone?: string | null;
  address?: string | null;
}

export function EditCustomerButton({
  customerId,
  customerName,
  phone,
  address
}: EditCustomerButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const { pushToast } = useToast();

  const handleDeleteSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (confirmation !== customerName) {
      event.preventDefault();
      pushToast({
        title: "Confirmation needed",
        description: `Please type "${customerName}" to confirm deletion.`,
        tone: "error",
      });
    }
  };

  return (
    <>
      <button
        type="button"
        className="icon-button h-11 w-11 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Manage customer"
      >
        <svg className="h-5 w-5 text-ink/80" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="12" cy="19" r="1.9" />
        </svg>
      </button>

      {open ? (
        <div className="dialog-backdrop fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center sm:py-6">
          <div className="dialog-panel w-full max-w-2xl overflow-hidden">
            <div className="border-b border-line/80 bg-white/40 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-khata">
                    Customer details
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-ink sm:text-[2rem]">
                    {customerName}
                  </h3>
                  <p className="mt-1 text-sm text-ink/65">
                    Update contact details or remove the customer when the ledger is empty.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="icon-button h-10 w-10 shrink-0"
                  aria-label="Close customer dialog"
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
                <div className="soft-panel px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">Phone</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{phone || "Not added yet"}</p>
                </div>
                <div className="soft-panel px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">Address</p>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-ink">
                    {address || "Not added yet"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <form
                  action={updateCustomerAction}
                  className="section-spacing"
                >
                  <input
                    type="hidden"
                    name="customer_id"
                    value={customerId}
                  />

                  <div className="stack-grid sm:grid-cols-2">
                    <div className="field-stack">
                      <label className="text-sm font-medium text-ink">Customer name</label>
                      <input
                        name="name"
                        defaultValue={customerName}
                        required
                      />
                    </div>

                    <div className="field-stack">
                      <label className="text-sm font-medium text-ink">Phone number</label>
                      <input
                        name="phone"
                        defaultValue={phone ?? ""}
                        placeholder="98XXXXXXXX"
                      />
                    </div>
                  </div>

                  <div className="field-stack">
                    <label className="text-sm font-medium text-ink">Address</label>
                    <textarea
                      name="address"
                      rows={3}
                      defaultValue={address ?? ""}
                      placeholder="Tole / house name"
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 border-t border-line/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-ink/60">
                      Keep details short and clear so the khata stays easy to scan.
                    </p>
                    <SubmitButton
                      idle="Save changes"
                      pending="Saving..."
                      className="button-primary w-full sm:w-auto"
                    />
                  </div>
                </form>
              </div>

              <aside className="border-t border-line/80 bg-white/30 px-4 py-4 sm:px-6 lg:border-l lg:border-t-0">
                <div className="rounded-[24px] border border-red-200/70 bg-red-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                    Danger zone
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">Delete customer</p>
                  <p className="mt-1 text-sm text-ink/65">
                    This only works when the customer has no ledger entries.
                  </p>

                  <form action={deleteCustomerAction} className="mt-4" onSubmit={handleDeleteSubmit}>
                    <input
                      type="hidden"
                      name="customer_id"
                      value={customerId}
                    />
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-red-600/80">
                      Type customer name to confirm
                    </label>
                    <input
                      name="confirmation"
                      type="text"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder={`Type "${customerName}"`}
                      className="bg-white"
                    />
                    <SubmitButton
                      idle="Delete customer"
                      pending="Deleting..."
                      className="mt-3 w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-70"
                    />
                  </form>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
