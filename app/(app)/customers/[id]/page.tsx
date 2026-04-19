import dynamic from "next/dynamic";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CustomerLedgerActions } from "@/components/customer-ledger-actions";
import { CustomerLedgerHeader } from "@/components/customer-ledger-header";
import { CustomerLedgerPagination } from "@/components/customer-ledger-pagination";
import { CustomerLedgerTable } from "@/components/customer-ledger-table";
import { MobileLedgerRow } from "@/components/mobile-ledger-row";
import { StickyMobileActionBar } from "@/components/sticky-mobile-action-bar";
import { getCustomerLedger } from "@/lib/baaki";
import { requireStoreContext } from "@/lib/auth";
import {
  formatDays,
  formatLongDate,
} from "@/lib/utils";

const EditCustomerButton = dynamic(
  () => import("@/components/edit-customer-button").then((mod) => mod.EditCustomerButton),
  { loading: () => <div className="button-secondary w-full sm:w-auto text-center">Loading customer tools...</div> },
);
const LedgerInsightsModal = dynamic(
  () => import("@/components/ledger-insights-modal").then((mod) => mod.LedgerInsightsModal),
  { loading: () => <div className="button-secondary w-full sm:w-auto text-center">Loading insights...</div> },
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
  const { customer, rows, currentBalance, insights, pagination } =
    await getCustomerLedger(supabase, id, {
      page,
      pageSize: 25,
      riskThreshold: store.risk_threshold,
    });

  return (
    <div className="section-spacing pb-24 md:pb-0">
      <CustomerLedgerHeader
        customerName={customer.name}
        customerPhone={customer.phone}
        customerAddress={customer.address}
        currentBalance={currentBalance}
        riskLevel={insights.risk_level}
        lastPaymentDate={insights.last_payment_date}
        daysSinceLastPayment={insights.days_since_last_payment}
        actions={
          <>
            <LedgerInsightsModal
              lastPaymentLabel={
                insights.last_payment_date
                  ? formatLongDate(insights.last_payment_date)
                  : "No payment yet"
              }
              daysSincePaymentLabel={formatDays(insights.days_since_last_payment)}
              paymentFrequencyLabel={
                insights.payment_frequency == null
                  ? "Need 2 payments"
                  : `${Math.round(insights.payment_frequency)} days`
              }
              riskScoreLabel={String(insights.risk_score)}
            />
            {store.role === "OWNER" ? (
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

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div id="quick-entry">
          <CollapsibleSection
            title="Quick entry"
            subtitle="Fast keypad, offline queue, and voice input."
            defaultOpen
          >
            <QuickEntryForm customerId={id} mode={mode} />
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
          <CustomerLedgerActions
            customerId={id}
            customerName={customer.name}
            currentBalance={currentBalance}
            canManageSms={store.role === "OWNER"}
            hasPhone={Boolean(customer.phone)}
            entitlements={store.entitlements}
            ReminderButton={SendReminderButton}
            ShareActions={ShareActions}
          />

          <div id="ledger-list" className="space-y-2.5 md:hidden">
            {rows.length ? (
              rows.map((row) => (
                <MobileLedgerRow key={row.id} row={row} customerName={customer.name} />
              ))
            ) : (
              <p className="rounded-3xl border border-dashed border-line bg-paper px-4 py-6 text-sm text-ink/65">
                No entries yet. Write the first baaki or payment.
              </p>
            )}
          </div>

          <CustomerLedgerTable rows={rows} customerName={customer.name} />

          <CustomerLedgerPagination
            customerId={id}
            mode={mode}
            page={pagination.page}
            totalPages={pagination.totalPages}
          />
        </CollapsibleSection>
      </div>

      <StickyMobileActionBar customerId={id} />
    </div>
  );
}
