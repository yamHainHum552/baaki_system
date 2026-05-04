import dynamic from "next/dynamic";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CustomerLedgerActions } from "@/components/customer-ledger-actions";
import { CustomerLedgerHeader } from "@/components/customer-ledger-header";
import { CustomerLedgerPagination } from "@/components/customer-ledger-pagination";
import { CustomerLedgerTable } from "@/components/customer-ledger-table";
import { LedgerAuditHistory } from "@/components/ledger-audit-history";
import { MobileLedgerRow } from "@/components/mobile-ledger-row";
import { StickyMobileActionBar } from "@/components/sticky-mobile-action-bar";
import { getCustomerLedger, getCustomerLedgerAuditEvents } from "@/lib/baaki";
import { requireStoreContext } from "@/lib/auth";
import { hasStorePermission } from "@/lib/store-permissions";
import {
  formatDays,
  formatLongDate,
} from "@/lib/utils";

const EditCustomerButton = dynamic(
  () => import("@/components/edit-customer-button").then((mod) => mod.EditCustomerButton),
  { loading: () => <div className="button-secondary w-full sm:w-auto text-center">Loading customer tools...</div> },
);
const QuickEntryForm = dynamic(
  () => import("@/components/quick-entry-form").then((mod) => mod.QuickEntryForm),
  { loading: () => <div className="soft-panel p-4 text-sm text-ink/65">Loading quick entry...</div> },
);
const SendReminderButton = dynamic(
  () => import("@/components/send-reminder-button").then((mod) => mod.SendReminderButton),
  { loading: () => <div className="button-secondary w-full text-center">Loading reminder tools...</div> },
);
const ShareActions = dynamic(
  () => import("@/components/share-actions").then((mod) => mod.ShareActions),
  { loading: () => <div className="soft-panel p-4 text-sm text-ink/65">Loading share tools...</div> },
);

export default async function CustomerLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; error?: string; page?: string }>;
}) {
  const { supabase, store } = await requireStoreContext();
  const { id } = await params;
  const query = await searchParams;
  const mode = query.mode === "payment" ? "payment" : "baaki";
  const page = Number(query.page ?? "1");
  const canManageCustomers = hasStorePermission(
    store.role,
    store.permissions,
    "manage_customers",
  );
  const canManageLedger = hasStorePermission(
    store.role,
    store.permissions,
    "manage_ledger",
  );
  const canSendSms = hasStorePermission(
    store.role,
    store.permissions,
    "send_sms_reminders",
  );
  const canShareLedger = hasStorePermission(
    store.role,
    store.permissions,
    "share_customer_ledger",
  );
  const canExportLedger = hasStorePermission(
    store.role,
    store.permissions,
    "export_customer_ledger",
  );
  const { customer, rows, currentBalance, insights, pagination } =
    await getCustomerLedger(supabase, id, {
      page,
      pageSize: 25,
      riskThreshold: store.risk_threshold,
    });
  const auditEvents = await getCustomerLedgerAuditEvents(supabase, id);

  return (
    <div className="section-spacing pb-24 md:pb-0">
      <CustomerLedgerHeader
        customerId={id}
        customerName={customer.name}
        customerPhone={customer.phone}
        customerAddress={customer.address}
        currentBalance={currentBalance}
        canManageLedger={canManageLedger}
        riskLevel={insights.risk_level}
        lastPaymentDate={insights.last_payment_date}
        daysSinceLastPayment={insights.days_since_last_payment}
        actions={
          <>
            {canManageCustomers ? (
              <EditCustomerButton
                customerId={id}
                customerName={customer.name}
                phone={customer.phone}
                address={customer.address}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)] xl:items-start">
        <div className="section-spacing xl:sticky xl:top-24">
          <div id="quick-entry">
            <CollapsibleSection
              title="Quick entry"
              subtitle="Fast keypad, offline queue, and voice input."
              defaultOpen
            >
              {canManageLedger ? (
                <QuickEntryForm customerId={id} mode={mode} />
              ) : (
                <div className="soft-panel p-4 text-sm text-ink/65">
                  Your owner has limited ledger-entry access for this staff account.
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>

        <div className="section-spacing">
          <div id="customer-tools">
            <CollapsibleSection
              title="Customer tools"
              subtitle="Insights, exports, reminders, and share options in one place."
              defaultOpen
            >
            <CustomerLedgerActions
              insights={[
                {
                  label: "Last payment",
                  value: insights.last_payment_date
                    ? formatLongDate(insights.last_payment_date)
                    : "No payment yet",
                  tone: "khata",
                },
                {
                  label: "Days since payment",
                  value: formatDays(insights.days_since_last_payment),
                  tone: "moss",
                },
                {
                  label: "Payment frequency",
                  value:
                    insights.payment_frequency == null
                      ? "Need 2 payments"
                      : `${Math.round(insights.payment_frequency)} days`,
                },
                {
                  label: "Risk score",
                  value: String(insights.risk_score),
                  tone: "khata",
                },
              ]}
              customerId={id}
              customerName={customer.name}
              currentBalance={currentBalance}
              canManageSms={canSendSms}
              canExportLedger={canExportLedger}
              canShareLedger={canShareLedger}
              hasPhone={Boolean(customer.phone)}
              entitlements={store.entitlements}
              ReminderButton={SendReminderButton}
              ShareActions={ShareActions}
            />
            </CollapsibleSection>
          </div>

          <CollapsibleSection
            title="Khata ledger"
            subtitle="Running balance after every baaki and payment."
            defaultOpen
            summaryRight={
              <span className="hidden rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/65 sm:inline-flex">
                {pagination.total} entries
              </span>
            }
          >
            <div id="ledger-list" className="space-y-2.5 md:hidden">
              {rows.length ? (
                rows.map((row) => (
                  <MobileLedgerRow
                    key={row.id}
                    row={row}
                    customerName={customer.name}
                    canDelete={canManageLedger}
                  />
                ))
              ) : (
                <p className="rounded-3xl border border-dashed border-line bg-paper px-4 py-6 text-sm text-ink/65">
                  No entries yet. Write the first baaki or payment.
                </p>
              )}
            </div>

            <CustomerLedgerTable
              rows={rows}
              customerName={customer.name}
              canDelete={canManageLedger}
            />

            <CustomerLedgerPagination
              customerId={id}
              mode={mode}
              page={pagination.page}
              totalPages={pagination.totalPages}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Ledger history"
            subtitle="Recent created and deleted ledger activity."
            defaultOpen={false}
          >
            <LedgerAuditHistory events={auditEvents} />
          </CollapsibleSection>
        </div>
      </div>

      {canManageLedger ? (
        <StickyMobileActionBar customerId={id} currentMode={mode} />
      ) : null}
    </div>
  );
}
