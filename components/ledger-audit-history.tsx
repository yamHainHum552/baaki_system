import { formatLongDate } from "@/lib/utils";
import type { LedgerAuditEvent } from "@/lib/baaki";

export function LedgerAuditHistory({
  events,
}: {
  events: LedgerAuditEvent[];
}) {
  if (!events.length) {
    return (
      <p className="rounded-3xl border border-dashed border-line bg-paper px-4 py-6 text-sm text-ink/65">
        No ledger history recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event) => {
        const amount = Number(event.details?.amount ?? 0);
        const type = String(event.details?.type ?? "");
        const description = String(event.details?.description ?? "");

        return (
          <div key={event.id} className="soft-panel px-3 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink">{formatAction(event.action)}</p>
              <p className="text-xs text-ink/55">{formatLongDate(event.created_at)}</p>
            </div>
            <p className="mt-1 text-ink/65">
              {[type, amount > 0 ? `Rs. ${Math.round(amount)}` : "", description]
                .filter(Boolean)
                .join(" - ") || "Ledger entry changed"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
