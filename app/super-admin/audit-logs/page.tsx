import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { listAdminAuditLogs, requireAdminAccess } from "@/lib/admin";
import { formatLongDate } from "@/lib/utils";

export default async function SuperAdminAuditLogsPage() {
  const admin = await requireAdminAccess();
  const rows = await listAdminAuditLogs(admin.adminClient);

  return (
    <div className="section-spacing">
      <CollapsibleSection title="Audit logs" subtitle="Admin actions plus key store-side events." defaultOpen>
        <div className="space-y-2.5">
          {rows.map((row: any) => (
            <div key={`${row.source}-${row.id}`} className="soft-panel px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{row.action.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-ink/60">
                    {row.kind} {row.store_id ? `• store ${row.store_id.slice(0, 8)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <AdminStatusBadge label={row.source} tone={row.source === "admin" ? "khata" : "slate"} />
                  <p className="mt-1 text-xs text-ink/50">{formatLongDate(row.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
