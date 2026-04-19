"use client";

import { useState, type FormEvent } from "react";
import { deleteLedgerEntryAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { useToast } from "@/components/toast-provider";

interface DeleteLedgerEntryButtonProps {
  entryId: string;
  customerName: string;
}

export function DeleteLedgerEntryButton({
  entryId,
  customerName,
}: DeleteLedgerEntryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const { pushToast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
        onClick={() => setIsModalOpen(true)}
        className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        title="Delete entry"
      >
        Delete
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[28px] border border-line bg-paper p-5 shadow-lg sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-khata">
              Confirm delete
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink">
              Delete Ledger Entry
            </h3>
            <p className="mt-2 text-sm text-ink/65">
              This action cannot be undone. To confirm, type the customer name:{" "}
              <strong className="text-ink">{customerName}</strong>
            </p>

            <form action={deleteLedgerEntryAction} onSubmit={handleSubmit}>
              <input type="hidden" name="entry_id" value={entryId} />
              <input
                name="confirmation"
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={`Type "${customerName}"`}
                className="mt-4 w-full rounded-2xl border border-line bg-warm px-4 py-3 text-sm text-ink placeholder-ink/50"
                autoFocus
              />
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setConfirmation("");
                  }}
                  className="button-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <SubmitButton
                  idle="Delete"
                  pending="Deleting..."
                  className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-70 sm:w-auto"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
