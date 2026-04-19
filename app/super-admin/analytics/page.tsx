import { CollapsibleSection } from "@/components/collapsible-section";
import { requireAdminAccess, getPlatformAnalytics } from "@/lib/admin";
import { formatNumber } from "@/lib/utils";

export default async function SuperAdminAnalyticsPage() {
  const admin = await requireAdminAccess(["SUPER_ADMIN", "OPS_ADMIN", "BILLING_ADMIN"]);
  const analytics = await getPlatformAnalytics(admin.adminClient);

  return (
    <div className="section-spacing">
      <section className="grid gap-4 xl:grid-cols-2">
        <CollapsibleSection title="Store growth" subtitle="Monthly store creation trend." defaultOpen>
          <div className="space-y-2.5">
            {analytics.monthlyStoreGrowth.map((row) => (
              <div key={row.month} className="soft-panel flex items-center justify-between px-3 py-3">
                <span className="text-sm font-semibold text-ink">{row.month}</span>
                <span className="text-sm text-ink/70">{formatNumber(row.count)} stores</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Premium conversion" subtitle="Monthly premium store count trend." defaultOpen>
          <div className="space-y-2.5">
            {analytics.premiumByMonth.map((row) => (
              <div key={row.month} className="soft-panel flex items-center justify-between px-3 py-3">
                <span className="text-sm font-semibold text-ink">{row.month}</span>
                <span className="text-sm text-ink/70">{formatNumber(row.count)} premium activations</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CollapsibleSection title="Store status" subtitle="Active vs suspended stores." defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="soft-panel px-3 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-ink/45">Active</p>
              <p className="mt-1 text-xl font-semibold text-moss">{formatNumber(analytics.activeStatusBreakdown.active)}</p>
            </div>
            <div className="soft-panel px-3 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-ink/45">Suspended</p>
              <p className="mt-1 text-xl font-semibold text-red-600">{formatNumber(analytics.activeStatusBreakdown.suspended)}</p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Feature usage trends" subtitle="Monthly SMS, export, and share-link totals." defaultOpen>
          <div className="space-y-2.5">
            {analytics.usageByMonth.map((row) => (
              <div key={row.month} className="soft-panel px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{row.month}</span>
                  <span className="text-xs text-ink/55">Platform total</span>
                </div>
                <p className="mt-2 text-sm text-ink/70">
                  {formatNumber(row.sms)} SMS • {formatNumber(row.exports)} exports • {formatNumber(row.shareLinks)} share links
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}
