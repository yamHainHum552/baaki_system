import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { listUsageMonitoring, requireAdminAccess } from "@/lib/admin";
import { formatNumber } from "@/lib/utils";

export default async function SuperAdminUsagePage() {
  const admin = await requireAdminAccess(["SUPER_ADMIN", "OPS_ADMIN", "BILLING_ADMIN"]);
  const rows = await listUsageMonitoring(admin.adminClient);

  return (
    <div className="section-spacing">
      <CollapsibleSection title="Usage monitoring" subtitle="Current monthly usage against store-level limits." defaultOpen>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.14em] text-ink/45">
              <tr>
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Customers</th>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">SMS</th>
                <th className="px-3 py-2">Exports</th>
                <th className="px-3 py-2">Links</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.store_id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold text-ink">
                    <Link href={`/super-admin/stores/${row.store_id}`} className="hover:text-khata">
                      {row.store_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <AdminStatusBadge label={row.admin_status} tone={row.admin_status === "active" ? "moss" : "red"} />
                  </td>
                  <td className="px-3 py-3">
                    <AdminStatusBadge label={(row.subscription?.plan_type ?? "free").replaceAll("_", " ")} tone={row.subscription?.plan_type === "free" ? "slate" : "moss"} />
                  </td>
                  <td className="px-3 py-3 text-ink/70">
                    {formatNumber(row.usage?.customer_count_snapshot ?? 0)} / {formatNumber(row.subscription?.max_customers ?? 50)}
                  </td>
                  <td className="px-3 py-3 text-ink/70">
                    {formatNumber(row.usage?.staff_count_snapshot ?? 0)} / {formatNumber(row.subscription?.max_staff ?? 1)}
                  </td>
                  <td className="px-3 py-3 text-ink/70">
                    {formatNumber(row.usage?.sms_sent_count ?? 0)} / {formatNumber(row.subscription?.max_sms_per_month ?? 0)}
                  </td>
                  <td className="px-3 py-3 text-ink/70">
                    {formatNumber(row.usage?.export_count ?? 0)} / {formatNumber(row.subscription?.max_exports_per_month ?? 3)}
                  </td>
                  <td className="px-3 py-3 text-ink/70">
                    {formatNumber(row.usage?.share_link_count ?? 0)} / {formatNumber(row.subscription?.max_share_links_per_month ?? 5)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  );
}
