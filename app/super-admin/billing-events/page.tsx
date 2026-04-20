import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { listBillingEvents, requireAdminAccess } from "@/lib/admin";
import { formatLongDate } from "@/lib/utils";

export default async function SuperAdminBillingEventsPage() {
  const admin = await requireAdminAccess(["SUPER_ADMIN", "BILLING_ADMIN"]);
  const events = await listBillingEvents(admin.adminClient);

  return (
    <div className="section-spacing">
      <CollapsibleSection title="Billing events" subtitle="Provider webhook and billing-event monitor." defaultOpen>
        <div className="space-y-3">
          {events.map((event: any) => (
            <div key={event.id} className="soft-panel px-4 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{event.event_type}</p>
                    <AdminStatusBadge label={event.provider} tone="khata" />
                    <AdminStatusBadge label={event.status} tone={event.status === "received" ? "amber" : "moss"} />
                  </div>
                  <p className="mt-1 text-xs text-ink/60">
                    {event.stores?.name ?? "No store linked"} / {formatLongDate(event.received_at)}
                  </p>
                  <p className="mt-1 text-xs text-ink/55">
                    {event.provider_reference ?? "No provider reference"}
                    {event.processing_result ? ` / ${event.processing_result}` : ""}
                  </p>
                </div>
                <details className="w-full xl:max-w-xl">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-khata">
                    View payload
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-2xl bg-ink px-3 py-3 text-xs text-white">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
