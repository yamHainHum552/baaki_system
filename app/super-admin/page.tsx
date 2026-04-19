import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { requireAdminAccess, getPlatformOverview } from "@/lib/admin";
import { formatNumber } from "@/lib/utils";

export default async function SuperAdminOverviewPage() {
  const admin = await requireAdminAccess();
  const overview = await getPlatformOverview(admin.adminClient);

  return (
    <div className="section-spacing">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total stores" value={formatNumber(overview.totalStores)} />
        <MetricCard
          label="Premium stores"
          value={formatNumber(overview.premiumStores)}
          sublabel={`${Math.round(overview.premiumConversionRate * 100)}% conversion`}
        />
        <MetricCard
          label="Pending requests"
          value={formatNumber(overview.pendingPremiumRequests)}
          sublabel={`${formatNumber(overview.trialingStores)} trialing`}
        />
        <MetricCard
          label="Usage this month"
          value={formatNumber(overview.smsUsageThisMonth)}
          sublabel={`${formatNumber(overview.exportUsage)} exports • ${formatNumber(overview.shareLinkUsage)} links`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <CollapsibleSection
          title="Platform health"
          subtitle="Store activity, plan mix, and operational signals."
          defaultOpen
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <HealthTile label="Active stores" value={formatNumber(overview.activeStores)} />
            <HealthTile label="Suspended stores" value={formatNumber(overview.suspendedStores)} tone="red" />
            <HealthTile label="Users" value={formatNumber(overview.totalUsers)} />
            <HealthTile label="Customers" value={formatNumber(overview.totalCustomers)} />
            <HealthTile label="Ledger entries" value={formatNumber(overview.totalLedgerEntries)} />
            <HealthTile label="New stores this week" value={formatNumber(overview.newStoresThisWeek)} tone="moss" />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Plan mix"
          subtitle="Free, premium, and billing-risk distribution."
          defaultOpen
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <HealthTile label="Free" value={formatNumber(overview.freeStores)} />
            <HealthTile label="Premium" value={formatNumber(overview.premiumStores)} tone="moss" />
            <HealthTile label="Trialing" value={formatNumber(overview.trialingStores)} tone="amber" />
            <HealthTile label="Past due / cancelled" value={formatNumber(overview.pastDueOrCancelledStores)} tone="red" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/super-admin/premium-requests" className="button-secondary">
              Review premium requests
            </Link>
            <Link href="/super-admin/stores" className="button-secondary">
              Open stores module
            </Link>
          </div>
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CollapsibleSection
          title="Stores near limits"
          subtitle="Free or premium stores approaching customer or staff caps."
          defaultOpen
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.14em] text-ink/45">
                <tr>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Customers</th>
                  <th className="px-3 py-2">Staff</th>
                </tr>
              </thead>
              <tbody>
                {overview.storesNearLimits.length ? (
                  overview.storesNearLimits.map((store) => (
                    <tr key={store.store_id} className="border-t border-line">
                      <td className="px-3 py-3 font-medium text-ink">
                        <Link href={`/super-admin/stores/${store.store_id}`} className="hover:text-khata">
                          {store.store_name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <AdminStatusBadge
                          label={store.plan_type.replaceAll("_", " ")}
                          tone={store.plan_type === "free" ? "slate" : "moss"}
                        />
                      </td>
                      <td className="px-3 py-3 text-ink/70">
                        {Math.round(store.customers_ratio * 100)}%
                      </td>
                      <td className="px-3 py-3 text-ink/70">
                        {Math.round(store.staff_ratio * 100)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-ink/60">
                      No stores are close to the tracked limits right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Recent activity"
          subtitle="Combined admin and store-side events."
          defaultOpen
        >
          <div className="space-y-2.5">
            {overview.recentActivity.map((item) => (
              <div key={`${item.source}-${item.id}`} className="soft-panel px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.action.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-ink/60">
                      {item.store_name ?? "Platform"} • {item.source}
                    </p>
                  </div>
                  <AdminStatusBadge
                    label={item.source}
                    tone={item.source === "admin" ? "khata" : "slate"}
                  />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="stat-card">
      <p className="text-xs text-ink/60 sm:text-sm">{label}</p>
      <p className="mt-1 font-serif text-2xl text-ink sm:text-3xl">{value}</p>
      {sublabel ? <p className="mt-2 text-xs text-ink/60">{sublabel}</p> : null}
    </div>
  );
}

function HealthTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "moss" | "amber" | "red";
}) {
  const toneClass =
    tone === "moss"
      ? "text-moss"
      : tone === "amber"
        ? "text-amber-800"
        : tone === "red"
          ? "text-red-600"
          : "text-ink";

  return (
    <div className="soft-panel px-3 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
