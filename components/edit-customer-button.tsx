"use client";

import { useState } from "react";
import { deleteCustomerAction, updateCustomerAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

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

  return (
    <>
      <button
        type="button"
        className="button-secondary w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        Manage customer
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center sm:py-6">
          <div className="surface-panel w-full max-w-xl p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-khata">
                  Customer
                </p>
                <h3 className="mt-2 font-serif text-xl text-ink sm:text-2xl">Edit details</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-ink/60 hover:text-ink"
              >
                Close
              </button>
            </div>

            <form
              action={updateCustomerAction}
              className="section-spacing mt-4"
            >
              <input
                type="hidden"
                name="customer_id"
                value={customerId}
              />

              <div className="stack-grid sm:grid-cols-2">
                <div className="field-stack">
                  <label className="text-sm font-medium text-ink">Name</label>
                  <input
                    name="name"
                    defaultValue={customerName}
                    required
                  />
                </div>

                <div className="field-stack">
                  <label className="text-sm font-medium text-ink">Phone</label>
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

              <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-between">
                <SubmitButton
                  idle="Save changes"
                  pending="Saving..."
                  className="button-primary w-full sm:w-auto"
                />
              </div>
            </form>

            <form action={deleteCustomerAction} className="mt-5 border-t border-line pt-4">
              <input
                type="hidden"
                name="customer_id"
                value={customerId}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Delete customer</p>
                  <p className="text-sm text-ink/65">
                    This works only when the customer has no ledger entries.
                  </p>
                </div>
                <SubmitButton
                  idle="Delete customer"
                  pending="Deleting..."
                  className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-70"
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
