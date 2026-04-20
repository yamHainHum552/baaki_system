import Link from "next/link";
import {
  addAdminSupportNoteAction,
  resetStoreUsageAction,
  updatePremiumRequestStatusAction,
  updateStoreAdminStatusAction,
  updateStoreFeatureFlagsAction,
  updateStoreSubscriptionAction,
} from "@/app/super-admin/actions";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SubmitButton } from "@/components/submit-button";
import { requireAdminAccess, getAdminStoreDetail } from "@/lib/admin";
import { formatDate, formatLongDate, formatNumber } from "@/lib/utils";

export default async function SuperAdminStoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const admin = await requireAdminAccess();
  const { id } = await params;
  const query = await searchParams;
  const detail = await getAdminStoreDetail(admin.adminClient, id);

  return (
    <div className="section-spacing">
      <div className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Link href="/super-admin/stores" className="text-sm font-semibold text-khata">
              Back to stores
            </Link>
            <h1 className="mt-2 font-serif text-3xl text-ink">{detail.store.name}</h1>
            <p className="mt-2 text-sm text-ink/65">
              {detail.store.phone ?? "No store phone"} / Created {formatLongDate(detail.store.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminStatusBadge label={detail.store.admin_status} tone={detail.store.admin_status === "active" ? "moss" : "red"} />
              <AdminStatusBadge label={detail.subscription?.plan_type?.replaceAll("_", " ") ?? "free"} tone={detail.subscription?.plan_type === "free" ? "slate" : "moss"} />
              <AdminStatusBadge label={detail.subscription?.plan_status ?? "active"} tone={detail.subscription?.plan_status === "active" ? "moss" : detail.subscription?.plan_status === "trialing" ? "amber" : "red"} />
            </div>
          </div>

          <form action={updateStoreAdminStatusAction} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
            <input type="hidden" name="store_id" value={id} />
            <input
              name="reason"
              placeholder={detail.store.admin_status === "active" ? "Reason for suspension" : "Reactivation note"}
            />
            <input type="hidden" name="status" value={detail.store.admin_status === "active" ? "suspended" : "active"} />
            <SubmitButton
              idle={detail.store.admin_status === "active" ? "Suspend store" : "Reactivate store"}
              pending={detail.store.admin_status === "active" ? "Suspending..." : "Reactivating..."}
              className={detail.store.admin_status === "active" ? "button-secondary" : "button-primary"}
            />
          </form>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <CollapsibleSection title="Store snapshot" subtitle="Operational summary and usage overview." defaultOpen>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Customers" value={formatNumber(detail.customersCount)} />
            <InfoTile label="Ledger entries" value={formatNumber(detail.ledgerCount)} />
            <InfoTile label="Last active" value={detail.lastActiveAt ? formatLongDate(detail.lastActiveAt) : "No activity"} />
            <InfoTile label="Trial ends" value={detail.subscription?.trial_ends_at ? formatLongDate(detail.subscription.trial_ends_at) : "No trial"} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InfoTile label="SMS this month" value={formatNumber(detail.usage?.sms_sent_count ?? 0)} />
            <InfoTile label="Exports" value={formatNumber(detail.usage?.export_count ?? 0)} />
            <InfoTile label="Share links" value={formatNumber(detail.usage?.share_link_count ?? 0)} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Members" subtitle="Owner and staff linked to this store." defaultOpen>
          <div className="space-y-2.5">
            {detail.members.map((member) => (
              <div key={member.user_id} className="soft-panel px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{member.full_name ?? member.email ?? "Unknown user"}</p>
                    <p className="mt-1 text-xs text-ink/60">{member.email ?? member.phone ?? "No contact info"}</p>
                  </div>
                  <AdminStatusBadge label={member.role} tone={member.role === "OWNER" ? "khata" : "slate"} />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <CollapsibleSection title="Subscription control" subtitle="Manual plan, billing, and limits control." defaultOpen>
          <form action={updateStoreSubscriptionAction} className="grid gap-3">
            <input type="hidden" name="store_id" value={id} />
            <div className="grid gap-3 lg:grid-cols-3">
              <select name="plan_type" defaultValue={detail.subscription?.plan_type ?? "free"}>
                <option value="free">Free</option>
                <option value="premium_monthly">Premium monthly</option>
                <option value="premium_yearly">Premium yearly</option>
              </select>
              <select name="plan_status" defaultValue={detail.subscription?.plan_status ?? "active"}>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
                <option value="inactive">Inactive</option>
              </select>
              <select name="billing_cycle" defaultValue={detail.subscription?.billing_cycle ?? "none"}>
                <option value="none">No billing</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <input name="subscription_starts_at" type="date" defaultValue={toDateInput(detail.subscription?.subscription_starts_at)} />
              <input name="subscription_ends_at" type="date" defaultValue={toDateInput(detail.subscription?.subscription_ends_at)} />
            </div>
            <div className="grid gap-3 lg:grid-cols-5">
              <input name="max_customers" type="number" defaultValue={detail.subscription?.max_customers ?? 50} placeholder="Max customers" />
              <input name="max_staff" type="number" defaultValue={detail.subscription?.max_staff ?? 1} placeholder="Max staff" />
              <input name="max_sms_per_month" type="number" defaultValue={detail.subscription?.max_sms_per_month ?? 0} placeholder="SMS / month" />
              <input name="max_exports_per_month" type="number" defaultValue={detail.subscription?.max_exports_per_month ?? 3} placeholder="Exports / month" />
              <input name="max_share_links_per_month" type="number" defaultValue={detail.subscription?.max_share_links_per_month ?? 5} placeholder="Links / month" />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <select name="premium_enabled" defaultValue={String(Boolean(detail.subscription?.premium_enabled))}>
                <option value="true">Premium enabled</option>
                <option value="false">Premium disabled</option>
              </select>
              <input name="billing_provider" defaultValue={detail.subscription?.billing_provider ?? ""} placeholder="Billing provider" />
              <input name="provider_subscription_id" defaultValue={detail.subscription?.provider_subscription_id ?? ""} placeholder="Provider subscription id" />
            </div>
            <SubmitButton
              idle="Save subscription"
              pending="Saving..."
              className="button-primary w-full sm:w-auto"
            />
          </form>
        </CollapsibleSection>

        <CollapsibleSection title="Feature flags & support" subtitle="Overrides, notes, and recovery tools." defaultOpen>
          <form action={updateStoreFeatureFlagsAction} className="space-y-3">
            <input type="hidden" name="store_id" value={id} />
            <textarea
              name="feature_flags"
              rows={5}
              defaultValue={JSON.stringify(detail.subscription?.feature_flags ?? {}, null, 2)}
              placeholder='{"forecast": true}'
            />
            <SubmitButton
              idle="Save feature flags"
              pending="Saving..."
              className="button-secondary w-full sm:w-auto"
            />
          </form>

          <form action={resetStoreUsageAction} className="mt-5">
            <input type="hidden" name="store_id" value={id} />
            <SubmitButton
              idle="Reset current usage counters"
              pending="Resetting..."
              className="button-secondary w-full sm:w-auto"
            />
          </form>

          <form action={addAdminSupportNoteAction} className="mt-5 space-y-3">
            <input type="hidden" name="store_id" value={id} />
            <select name="category" defaultValue="GENERAL">
              <option value="GENERAL">General</option>
              <option value="BILLING">Billing</option>
              <option value="SUPPORT">Support</option>
              <option value="RISK">Risk</option>
            </select>
            <textarea name="note" rows={4} placeholder="Add support note for future admins" />
            <SubmitButton
              idle="Save support note"
              pending="Saving..."
              className="button-primary w-full sm:w-auto"
            />
          </form>
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CollapsibleSection title="Premium request" subtitle="Current request and quick workflow actions." defaultOpen>
          {detail.request ? (
            <>
              <div className="soft-panel px-3 py-3">
                <p className="text-sm font-semibold text-ink">
                  Status: {detail.request.status}
                </p>
                <p className="mt-1 text-sm text-ink/70">
                  {detail.request.contact_phone ?? "No contact phone"} / Requested {formatLongDate(detail.request.created_at)}
                </p>
                {detail.request.notes ? (
                  <p className="mt-2 text-sm text-ink/65">{detail.request.notes}</p>
                ) : null}
              </div>

              <form action={updatePremiumRequestStatusAction} className="mt-4 grid gap-3">
                <input type="hidden" name="request_id" value={detail.request.id} />
                <input type="hidden" name="store_id" value={id} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <select name="status" defaultValue={detail.request.status}>
                    <option value="PENDING">Pending</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ACTIVATED">Activated</option>
                  </select>
                  <select name="activate_plan" defaultValue="">
                    <option value="">Do not activate plan</option>
                    <option value="premium_monthly">Activate premium monthly</option>
                    <option value="premium_yearly">Activate premium yearly</option>
                  </select>
                </div>
                <textarea name="admin_note" rows={3} placeholder="Admin note for this request" />
                <SubmitButton
                  idle="Update request"
                  pending="Updating..."
                  className="button-primary w-full sm:w-auto"
                />
              </form>
            </>
          ) : (
            <p className="text-sm text-ink/60">No premium request found for this store.</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Support notes" subtitle="Internal notes for platform operators." defaultOpen>
          <div className="space-y-2.5">
            {detail.supportNotes.length ? (
              detail.supportNotes.map((note: any) => (
                <div key={note.id} className="soft-panel px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <AdminStatusBadge label={note.category} tone="khata" />
                    <span className="text-xs text-ink/50">{formatLongDate(note.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink/75">{note.note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/60">No support notes yet.</p>
            )}
          </div>
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CollapsibleSection title="Billing history" subtitle="Verified payments, pending attempts, and provider references." defaultOpen>
          <div className="space-y-2.5">
            {detail.billingPayments.length ? (
              detail.billingPayments.map((payment: any) => (
                <div key={payment.id} className="soft-panel px-3 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">
                          {formatNumber(Number(payment.amount ?? 0))} {payment.currency}
                        </p>
                        <AdminStatusBadge label={payment.provider} tone="khata" />
                        <AdminStatusBadge
                          label={payment.status}
                          tone={
                            payment.status === "verified"
                              ? "moss"
                              : payment.status === "pending" || payment.status === "initiated"
                                ? "amber"
                                : "red"
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs text-ink/60">
                        {payment.plan_type?.replaceAll("_", " ")} / {payment.billing_cycle}
                      </p>
                      <p className="mt-1 text-xs text-ink/60">
                        Reference {payment.provider_reference_id ?? payment.provider_payment_id ?? payment.purchase_order_id}
                      </p>
                      <p className="mt-1 text-xs text-ink/50">
                        Initiated {formatLongDate(payment.initiated_at ?? payment.created_at)}
                        {payment.verified_at ? ` / Verified ${formatLongDate(payment.verified_at)}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/60">No billing history yet.</p>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Provider events" subtitle="Recent billing callbacks and verification events." defaultOpen={false}>
          <div className="space-y-2.5">
            {detail.billingEvents.length ? (
              detail.billingEvents.map((event: any) => (
                <div key={event.id} className="soft-panel px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusBadge label={event.provider} tone="khata" />
                    <AdminStatusBadge
                      label={event.status}
                      tone={
                        event.status === "verified" || event.status === "active"
                          ? "moss"
                          : event.status === "pending" || event.status === "received" || event.status === "initiated"
                            ? "amber"
                            : "red"
                      }
                    />
                    <p className="text-sm font-semibold text-ink">{event.event_type.replaceAll("_", " ")}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink/60">
                    {event.provider_reference ?? "No provider reference"} / {formatLongDate(event.received_at)}
                  </p>
                  {event.processing_result ? (
                    <p className="mt-1 text-xs text-ink/55">{event.processing_result}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/60">No provider events yet.</p>
            )}
          </div>
        </CollapsibleSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CollapsibleSection title="Admin audit" subtitle="Actions taken by platform admins." defaultOpen={false}>
          <div className="space-y-2.5">
            {detail.adminAuditLogs.map((row: any) => (
              <div key={row.id} className="soft-panel px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{row.action.replaceAll("_", " ")}</p>
                  <span className="text-xs text-ink/50">{formatLongDate(row.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-ink/60">{row.target_type}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Store audit" subtitle="Store-side subscription and ledger events." defaultOpen={false}>
          <div className="space-y-2.5">
            {detail.auditLogs.map((row: any) => (
              <div key={row.id} className="soft-panel px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{row.action.replaceAll("_", " ")}</p>
                  <span className="text-xs text-ink/50">{formatLongDate(row.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-ink/60">{row.entity_type}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel px-3 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function toDateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}
