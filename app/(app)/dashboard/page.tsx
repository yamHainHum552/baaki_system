import Link from "next/link";
import { requestPremiumPlanAction, startTrialAction } from "@/app/actions";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PremiumBadge } from "@/components/premium-badge";
import { SubmitButton } from "@/components/submit-button";
import { RiskBadge } from "@/components/risk-badge";
import { UsageProgress } from "@/components/usage-progress";
import { getDashboardSummary } from "@/lib/baaki";
import { requireStoreContext } from "@/lib/auth";
import { canUseAdvancedReports, canUseForecast } from "@/lib/entitlements";
import {
  formatBillingCycleLabel,
  formatCurrency,
  formatDate,
  formatDays,
  formatEntitlementPlanLabel,
  formatNumber,
  formatPlanStatusLabel,
  formatTrialCountdown,
} from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, store } = await requireStoreContext();
  const summary = await getDashboardSummary(
    supabase,
    store.id,
    store.risk_threshold,
    store.entitlements,
  );

  return (
    <div className="section-spacing">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3 xl:gap-6">
        <div className="stat-card">
          <p className="text-xs text-ink/65 sm:text-sm">Total baaki</p>
          <p className="mt-1 font-serif text-2xl text-khata sm:mt-2 sm:text-3xl">
            {formatCurrency(summary.totalBaaki)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-ink/65 sm:text-sm">Customers</p>
          <p className="mt-1 font-serif text-2xl text-ink sm:mt-2 sm:text-3xl">
            {formatNumber(summary.totalCustomers)}
          </p>
        </div>
        <div className="stat-card col-span-2 xl:col-span-1">
          <p className="text-xs text-ink/65 sm:text-sm">High dues</p>
          <p className="mt-1 font-serif text-2xl text-moss sm:mt-2 sm:text-3xl">
            {formatNumber(summary.highDueCount)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr] xl:gap-6">
        <div className="surface-panel p-4 sm:p-6 lg:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata sm:text-sm">
            {store.role === "OWNER" ? "Plan" : "Workspace"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h2 className="font-serif text-xl text-ink sm:text-2xl">
              {store.role === "OWNER"
                ? formatEntitlementPlanLabel(store.subscription.plan_type)
                : "Staff dashboard"}
            </h2>
            {store.entitlements.planBadgeLabel ? (
              <PremiumBadge label={store.entitlements.planBadgeLabel} />
            ) : null}
          </div>
          <p className="mt-2 text-sm text-ink/70">
            {store.role === "OWNER"
              ? store.entitlements.isTrialing
                ? formatTrialCountdown(store.entitlements.trialDaysRemaining)
                : `Status: ${formatPlanStatusLabel(store.entitlements.planStatus)} | ${formatBillingCycleLabel(store.subscription.billing_cycle)}`
              : "Use this dashboard to monitor customers, dues, and payment activity. Billing and team controls stay with the owner."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <UsageProgress
              label="Customers"
              used={store.entitlements.usage.customers_count}
              limit={store.entitlements.maxCustomers}
            />
            <UsageProgress
              label="Staff"
              used={store.entitlements.usage.staff_count}
              limit={store.entitlements.maxStaff}
              tone="ink"
            />
            <UsageProgress
              label="SMS"
              used={store.entitlements.usage.sms_sent_count}
              limit={store.entitlements.maxSmsPerMonth}
              tone="moss"
            />
            <UsageProgress
              label="Exports"
              used={store.entitlements.usage.export_count}
              limit={store.entitlements.maxExportsPerMonth}
              tone="khata"
            />
          </div>
        </div>

        <CollapsibleSection
          title={store.role === "OWNER" ? "Billing & access" : "Staff access"}
          subtitle={
            store.entitlements.isPremium
              ? store.role === "OWNER"
                ? "Premium features are active."
                : "You are working inside a Premium-enabled store."
              : store.role === "OWNER"
                ? "Free plan with upgrade path."
                : "Your access follows the store's current plan."
          }
          defaultOpen
          className="h-fit"
        >
          <h3 className="font-serif text-xl text-ink sm:text-2xl">
            {store.role === "OWNER"
              ? store.entitlements.isPremium
                ? "Premium is active"
                : "Free plan with upgrade path"
              : "Daily work, minus billing controls"}
          </h3>
          <p className="mt-2 text-sm text-ink/70">
            {store.role === "OWNER"
              ? store.entitlements.isPremium
                ? "Your store can use analytics, forecasts, exports, share links, and reminders based on the active entitlement."
                : "Free plan keeps khata simple. Premium unlocks reports, forecast, SMS reminders, and higher usage limits."
              : "You can work with customers and ledgers normally. Subscription, billing, team management, and upgrade actions are handled by the owner."}
          </p>
          <div className="mt-4 space-y-3">
            <div className="soft-panel px-3 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-ink/50">
                Locked features preview
              </p>
              <p className="mt-2 text-sm text-ink/70">
                {store.entitlements.lockedFeatures.length
                  ? store.entitlements.lockedFeatures
                      .slice(0, 4)
                      .map((feature) => feature.replaceAll("_", " "))
                      .join(", ")
                  : store.role === "OWNER"
                    ? "All tracked premium features are available."
                    : "All tracked plan-based features available to this store are active."}
              </p>
            </div>
            {store.role === "OWNER" ? (
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {!store.entitlements.isPremium && !store.subscription.trial_started_at ? (
                  <form action={startTrialAction}>
                    <SubmitButton
                      idle="Start Free Trial"
                      pending="Starting..."
                      className="button-secondary w-full sm:w-auto"
                    />
                  </form>
                ) : null}
                {!store.entitlements.isPremium ? (
                  <form action={requestPremiumPlanAction}>
                    <input type="hidden" name="contact_phone" value={store.phone ?? ""} />
                    <input type="hidden" name="notes" value="Requested from dashboard CTA" />
                    <SubmitButton
                      idle="Upgrade to Premium"
                      pending="Sending..."
                      className="button-primary w-full sm:w-auto"
                    />
                  </form>
                ) : null}
                <Link href="/settings" className="button-secondary text-center">
                  Billing settings
                </Link>
              </div>
            ) : (
              <div className="soft-panel px-4 py-3 text-sm text-ink/65">
                Staff can view plan access, but only the owner can manage billing, Premium requests, and team settings.
              </div>
            )}
          </div>
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-3 xl:gap-6">
        <CollapsibleSection
          title="Daily / monthly"
          subtitle="Recent baaki and payment movement."
          defaultOpen={false}
        >
          {canUseAdvancedReports(store.entitlements) ? (
            <>
              <div className="space-y-2.5">
                {summary.dailyReport.map((row) => (
                  <div key={row.bucket} className="soft-panel px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ink">
                        {formatDate(row.bucket)}
                      </span>
                      <span className="text-ink/70">
                        Net {formatCurrency(row.net_change)}
                      </span>
                    </div>
                    <p className="mt-1 text-ink/65">
                      Baaki {formatCurrency(row.total_baaki_added)} - Payment{" "}
                      {formatCurrency(row.total_payments_received)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <p className="mb-2 text-sm font-semibold text-ink">Monthly summary</p>
                <div className="space-y-2.5">
                  {summary.monthlyReport.map((row) => (
                    <div key={`month-${row.bucket}`} className="soft-panel px-3 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-ink">
                          {formatDate(row.bucket)}
                        </span>
                        <span className="text-ink/70">
                          Net {formatCurrency(row.net_change)}
                        </span>
                      </div>
                      <p className="mt-1 text-ink/65">
                        Baaki {formatCurrency(row.total_baaki_added)} - Payment{" "}
                        {formatCurrency(row.total_payments_received)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="soft-panel p-4">
              <p className="text-sm font-semibold text-ink">Premium analytics locked</p>
              <p className="mt-2 text-sm text-ink/65">
                Daily and monthly report cards unlock on Premium or during trial.
              </p>
              <Link href="/settings" className="mt-3 inline-flex text-sm font-semibold text-khata">
                Compare plans
              </Link>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Top debtors"
          subtitle="Customers with highest current baaki."
          defaultOpen={false}
        >
          {canUseAdvancedReports(store.entitlements) ? (
            <div className="space-y-2.5">
              {summary.topDebtors.map((customer) => (
                <div key={customer.customer_id} className="soft-panel px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-ink">
                      {customer.customer_name}
                    </span>
                    <span className="text-khata">
                      {formatCurrency(customer.total_baaki)}
                    </span>
                  </div>
                  <p className="mt-1 text-ink/65">
                    Longest unpaid: {formatDays(customer.longest_unpaid_days)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="soft-panel p-4">
              <p className="text-sm font-semibold text-ink">Top debtor list is on Premium</p>
              <p className="mt-2 text-sm text-ink/65">
                Upgrade to compare overdue customers and unpaid history across the store.
              </p>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Next 7 days"
          subtitle="Estimated incoming payments."
          defaultOpen={false}
        >
          {canUseForecast(store.entitlements) ? (
            <>
              <div className="rounded-2xl bg-paper px-3 py-3">
                <p className="text-xs text-ink/65 sm:text-sm">Expected collection</p>
                <p className="mt-1 text-xl font-semibold text-moss sm:text-2xl">
                  {formatCurrency(summary.forecast.next7DaysTotal)}
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {summary.forecast.rows.slice(0, 4).map((row) => (
                  <div key={row.customer_id} className="soft-panel px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ink">{row.customer_name}</span>
                      <span className="text-ink">{formatCurrency(row.expected_amount)}</span>
                    </div>
                    <p className="mt-1 text-ink/65">
                      {row.expected_payment_date
                        ? `Expected on ${formatDate(row.expected_payment_date)}`
                        : "Need more payment history"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="soft-panel p-4">
              <p className="text-sm font-semibold text-ink">Forecast unlocks on Premium</p>
              <p className="mt-2 text-sm text-ink/65">
                Get a 7-day payment estimate from customer payment rhythm.
              </p>
            </div>
          )}
        </CollapsibleSection>
      </section>

      <CollapsibleSection
        title="Customer balances"
        subtitle="Usually the first place to check before writing the next baaki."
        defaultOpen
      >
        <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
          {summary.customers.length ? (
            summary.customers.map((customer) => (
              <Link
                key={customer.customer_id}
                href={`/customers/${customer.customer_id}`}
                className="soft-panel block p-3 sm:p-5 hover:bg-white"
              >
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-ink sm:text-lg">
                      {customer.customer_name}
                    </p>
                    <p className="mt-1 text-xs text-ink/65 sm:text-sm">
                      {customer.last_entry_at
                        ? `Last written on ${formatDate(customer.last_entry_at)}`
                        : "No entries yet"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    {customer.risk_level ? (
                      <RiskBadge level={customer.risk_level} compact />
                    ) : null}
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink/50">
                      Current baaki
                    </p>
                    <p
                      className={`mt-1 text-lg font-semibold sm:text-xl ${
                        customer.balance >= 1000 ? "text-khata" : "text-ink"
                      }`}
                    >
                      {formatCurrency(customer.balance)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="col-span-full rounded-3xl border border-dashed border-line bg-paper px-4 py-6 text-sm text-ink/65">
              No customers yet. Add your first customer from the customers page.
            </p>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
