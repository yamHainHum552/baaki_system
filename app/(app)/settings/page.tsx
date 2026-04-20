import Link from "next/link";
import {
  addStaffMemberAction,
  removeStaffMemberAction,
  requestPremiumPlanAction,
  startTrialAction,
  updateStaffPermissionsAction,
} from "@/app/actions";
import { PremiumBadge } from "@/components/premium-badge";
import { PremiumRequestForm } from "@/components/premium-request-form";
import { SectionCard } from "@/components/section-card";
import { StoreBillingPanel } from "@/components/store-billing-panel";
import { SubmitButton } from "@/components/submit-button";
import { UsageProgress } from "@/components/usage-progress";
import { requireStoreRole } from "@/lib/auth";
import { getBillingCatalog, listStoreBillingHistory } from "@/lib/billing-service";
import { STORE_PERMISSION_OPTIONS } from "@/lib/store-permissions";
import { listStoreTeamMembers } from "@/lib/team";
import {
  formatCurrency,
  formatBillingCycleLabel,
  formatEntitlementPlanLabel,
  formatLongDate,
  formatPlanStatusLabel,
  formatTrialCountdown,
} from "@/lib/utils";

const premiumFeatures = [
  "Advanced daily and monthly reports",
  "Cash-flow forecast",
  "SMS reminders",
  "Unlimited or higher usage limits",
  "More exports and share links",
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  await searchParams;
  const { supabase, store } = await requireStoreRole(
    "OWNER",
    "/dashboard?error=Only%20owners%20can%20open%20billing%20settings",
  );
  const [teamMembers, billingCatalog, billingHistory] = await Promise.all([
    listStoreTeamMembers(store.id),
    Promise.resolve(getBillingCatalog()),
    listStoreBillingHistory(supabase, store.id),
  ]);

  return (
    <div className="section-spacing">
      <section className="surface-panel p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-khata">
              Billing settings
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl text-ink">
                {formatEntitlementPlanLabel(store.subscription.plan_type)}
              </h1>
              {store.entitlements.planBadgeLabel ? <PremiumBadge /> : null}
            </div>
            <p className="mt-2 text-sm text-ink/70">
              {formatPlanStatusLabel(store.entitlements.planStatus)} /{" "}
              {formatBillingCycleLabel(store.subscription.billing_cycle)}
            </p>
            {store.entitlements.isTrialing ? (
              <p className="mt-2 text-sm text-moss">
                {formatTrialCountdown(store.entitlements.trialDaysRemaining)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {!store.entitlements.isPremium && !store.subscription.trial_started_at ? (
              <form action={startTrialAction}>
                <SubmitButton
                  idle="Start Free Trial"
                  pending="Starting..."
                  className="button-secondary w-full sm:w-auto"
                />
              </form>
            ) : null}
            <Link href="/dashboard" className="button-secondary text-center">
              Back to dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Usage summary"
          subtitle="Current usage against the active store entitlement."
        >
          <div className="grid gap-3 sm:grid-cols-2">
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
              label="SMS this month"
              used={store.entitlements.usage.sms_sent_count}
              limit={store.entitlements.maxSmsPerMonth}
              tone="moss"
            />
            <UsageProgress
              label="Exports this month"
              used={store.entitlements.usage.export_count}
              limit={store.entitlements.maxExportsPerMonth}
            />
          </div>
          <div className="mt-3">
            <UsageProgress
              label="Share links this month"
              used={store.entitlements.usage.share_link_count}
              limit={store.entitlements.maxShareLinksPerMonth}
              tone="ink"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Premium features"
          subtitle="What Premium unlocks for the store."
        >
          <div className="space-y-3">
            {premiumFeatures.map((feature) => (
              <div key={feature} className="soft-panel px-4 py-3 text-sm text-ink/75">
                {feature}
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <StoreBillingPanel
        plans={billingCatalog.plans}
        providerAvailability={billingCatalog.providerAvailability}
      />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Team & staff"
          subtitle="Premium stores can add more staff. Added staff must already have a Baaki account."
        >
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="soft-panel p-4">
                <p className="text-sm font-semibold text-ink">Add staff member</p>
                <p className="mt-2 text-sm text-ink/65">
                  Add an existing user by email. They can switch into this store from their dashboard.
                </p>
                <form action={addStaffMemberAction} className="mt-4 grid gap-3">
                  <input
                    type="email"
                    name="email"
                    placeholder="staff@example.com"
                    autoComplete="email"
                  />
                  <SubmitButton
                    idle="Add staff"
                    pending="Adding..."
                    className="button-primary"
                  />
                </form>
              </div>
              <div className="mt-4 soft-panel p-4">
                <p className="text-sm font-semibold text-ink">Staff access policy</p>
                <div className="mt-3 space-y-2 text-sm text-ink/65">
                  <p>Only owners can add or remove staff.</p>
                  <p>Choose exactly which staff can manage customers, ledgers, reminders, share links, and exports.</p>
                  <p>Free plan supports a very small team. Premium increases staff capacity and unlocks more shared tools.</p>
                  <p>Owners are not removable from this section.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.user_id} className="soft-panel p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-ink">
                          {member.full_name ?? member.email ?? "Unnamed member"}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            member.role === "OWNER"
                              ? "bg-khata/10 text-khata"
                              : "bg-paper text-ink/70"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink/65">
                        {member.email ?? member.phone ?? "No contact info"}
                      </p>
                      <p className="mt-1 text-xs text-ink/50">
                        Joined {formatLongDate(member.created_at)}
                      </p>
                    </div>

                    {member.role === "STAFF" ? (
                      <div className="flex flex-col gap-2 sm:items-end">
                        <form action={removeStaffMemberAction}>
                          <input type="hidden" name="staff_user_id" value={member.user_id} />
                          <SubmitButton
                            idle="Remove"
                            pending="Removing..."
                            className="button-secondary w-full sm:w-auto"
                          />
                        </form>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">
                        Primary owner
                      </div>
                    )}
                  </div>

                  {member.role === "STAFF" ? (
                    <form action={updateStaffPermissionsAction} className="mt-4 space-y-3">
                      <input type="hidden" name="staff_user_id" value={member.user_id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {STORE_PERMISSION_OPTIONS.map((permission) => (
                          <label
                            key={`${member.user_id}-${permission.key}`}
                            className="soft-panel flex gap-3 px-3 py-3"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={permission.key}
                              defaultChecked={member.permissions.includes(permission.key)}
                              className="mt-1 h-4 w-4 shrink-0 rounded border-line text-khata focus:ring-khata"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-ink">
                                {permission.label}
                              </span>
                              <span className="mt-1 block text-xs text-ink/60">
                                {permission.description}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <SubmitButton
                        idle="Save permissions"
                        pending="Saving..."
                        className="button-secondary w-full sm:w-auto"
                      />
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Plan comparison"
          subtitle="Free is good for getting started. Premium expands store operations."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="soft-panel p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/60">
                Free
              </p>
              <h2 className="mt-2 font-serif text-2xl text-ink">Simple khata</h2>
              <div className="mt-4 space-y-2 text-sm text-ink/70">
                <p>Customer cap and staff cap apply</p>
                <p>CSV export stays limited</p>
                <p>Forecast and advanced reports stay locked</p>
                <p>Share links and exports are capped monthly</p>
              </div>
            </div>

            <div className="surface-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-ink">Premium</h2>
                <PremiumBadge />
              </div>
              <div className="mt-4 space-y-2 text-sm text-ink/70">
                <p>Higher customer and staff limits</p>
                <p>Advanced analytics and forecast enabled</p>
                <p>SMS reminders enabled</p>
                <p>Higher export and share-link allowance</p>
              </div>
              <p className="mt-4 text-sm text-ink/55">
                Yearly billing is ready for provider verification and safe premium activation.
              </p>
            </div>
          </div>
        </SectionCard>

        <PremiumRequestForm
          action={requestPremiumPlanAction}
          defaultPhone={store.phone ?? ""}
          requestStatus={store.upgrade_request_status}
        />
      </section>

      <SectionCard
        title="Billing history"
        subtitle="Latest payment attempts and verified premium activations."
      >
        <div className="space-y-3">
          {billingHistory.length ? (
            billingHistory.map((row: any) => (
              <div key={row.id} className="soft-panel p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {row.plan_type?.replaceAll("_", " ") ?? "premium"}
                      </p>
                      <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">
                        {row.provider}
                      </span>
                      <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink/65">
                      {formatCurrency(Number(row.amount ?? 0))} / {row.billing_cycle}
                    </p>
                    <p className="mt-1 text-xs text-ink/50">
                      Initiated {formatLongDate(row.initiated_at ?? row.created_at)}
                    </p>
                  </div>
                  <div className="text-sm text-ink/60">
                    {row.provider_reference_id ?? row.provider_payment_id ?? "Reference pending"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink/60">
              No billing activity yet. Upgrade attempts through Khalti or eSewa will appear here.
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
