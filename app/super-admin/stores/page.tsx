import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SubmitButton } from "@/components/submit-button";
import { listAdminStores, requireAdminAccess } from "@/lib/admin";
import { formatDate, formatNumber } from "@/lib/utils";

export default async function SuperAdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string; activity?: string; message?: string; error?: string }>;
}) {
  const admin = await requireAdminAccess();
  const params = await searchParams;
  const stores = await listAdminStores(admin.adminClient, {
    search: params.q,
    plan: params.plan,
    status: params.status,
    activity: params.activity,
  });

  return (
    <div className="section-spacing">
      <CollapsibleSection title="Stores" subtitle="Search and monitor stores across the platform." defaultOpen>
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by store name or phone"
          />
          <select name="plan" defaultValue={params.plan ?? ""}>
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="premium_monthly">Premium monthly</option>
            <option value="premium_yearly">Premium yearly</option>
          </select>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select name="activity" defaultValue={params.activity ?? ""}>
            <option value="">All activity</option>
            <option value="recent">Recently active</option>
            <option value="quiet">Quiet stores</option>
          </select>
          <SubmitButton
            idle="Filter"
            pending="Filtering..."
            className="button-secondary"
          />
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.14em] text-ink/45">
              <tr>
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Counts</th>
                <th className="px-3 py-2">Usage</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {stores.length ? (
                stores.map((store) => (
                  <tr key={store.id} className="border-t border-line">
                    <td className="px-3 py-3">
                      <Link href={`/super-admin/stores/${store.id}`} className="font-semibold text-ink hover:text-khata">
                        {store.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink/55">{store.phone ?? "No phone"}</p>
                    </td>
                    <td className="px-3 py-3 text-ink/70">
                      <p>{store.owner_name ?? "Unknown"}</p>
                      <p className="mt-1 text-xs">{store.owner_email ?? store.owner_phone ?? "No owner contact"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <AdminStatusBadge
                          label={store.plan_type.replaceAll("_", " ")}
                          tone={store.plan_type === "free" ? "slate" : "moss"}
                        />
                        <AdminStatusBadge
                          label={store.plan_status}
                          tone={store.plan_status === "active" ? "moss" : store.plan_status === "trialing" ? "amber" : "red"}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <AdminStatusBadge
                        label={store.admin_status}
                        tone={store.admin_status === "active" ? "moss" : "red"}
                      />
                    </td>
                    <td className="px-3 py-3 text-ink/70">
                      <p>{formatNumber(store.customer_count)} customers</p>
                      <p className="mt-1 text-xs">{formatNumber(store.staff_count)} staff • {formatNumber(store.ledger_count)} entries</p>
                    </td>
                    <td className="px-3 py-3 text-ink/70">
                      <p>{formatNumber(store.sms_sent_count)} SMS</p>
                      <p className="mt-1 text-xs">
                        {formatNumber(store.export_count)} exports • {formatNumber(store.share_link_count)} links
                      </p>
                    </td>
                    <td className="px-3 py-3 text-ink/70">{formatDate(store.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-ink/60">
                    No stores matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  );
}
