import Link from "next/link";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DeleteLedgerEntryButton } from "@/components/delete-ledger-entry-button";
import { EditCustomerButton } from "@/components/edit-customer-button";
import { LedgerInsightsModal } from "@/components/ledger-insights-modal";
import { MobileLedgerRow } from "@/components/mobile-ledger-row";
import { QuickEntryForm } from "@/components/quick-entry-form";
import { PremiumBadge } from "@/components/premium-badge";
import { RiskBadge } from "@/components/risk-badge";
import { SendReminderButton } from "@/components/send-reminder-button";
import { ShareActions } from "@/components/share-actions";
import { StickyMobileActionBar } from "@/components/sticky-mobile-action-bar";
import { getCustomerLedger } from "@/lib/baaki";
import { requireStoreContext } from "@/lib/auth";
import { canExportCsv, canExportPdf } from "@/lib/entitlements";
import {
  formatCurrency,
  formatDate,
  formatDays,
  formatLongDate,
} from "@/lib/utils";

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
      <div className="surface-panel p-4 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <Link href="/customers" className="text-sm font-semibold text-khata">
              Back to customers
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl text-ink sm:text-4xl">
                {customer.name}
              </h1>
              <RiskBadge level={insights.risk_level} compact />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="soft-panel px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">
                  Current baaki
                </p>
                <p className="mt-1 text-2xl font-semibold text-khata sm:text-3xl">
                  {formatCurrency(currentBalance)}
                </p>
              </div>
              <div className="soft-panel px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">
                  Last payment
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {insights.last_payment_date
                    ? formatLongDate(insights.last_payment_date)
                    : "No payment yet"}
                </p>
                <p className="mt-1 text-xs text-ink/60">
                  {formatDays(insights.days_since_last_payment)}
                </p>
              </div>
            </div>
            <details className="mt-3 rounded-2xl border border-line bg-paper md:hidden">
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-ink">
                View customer details
              </summary>
              <div className="border-t border-line px-3 py-3 text-sm text-ink/70">
                {customer.phone || customer.address || "Khata ledger"}
              </div>
            </details>
            <p className="mt-2 hidden text-sm text-ink/65 md:block md:text-base">
              {customer.phone || customer.address || "Khata ledger"}
            </p>
          </div>

          <div
            id="customer-actions"
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[340px]"
          >
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
          </div>
        </div>
      </div>

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
          <div id="ledger-actions" className="compact-section-spacing mb-4">
            <details className="rounded-[22px] border border-line bg-paper md:hidden">
              <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-ink">
                More actions
              </summary>
              <div className="compact-section-spacing border-t border-line px-3 py-3">
                <div className="grid grid-cols-2 gap-2">
                  {canExportCsv(store.entitlements) ? (
                    <a
                      href={`/api/export/customer-ledger?customerId=${id}&format=csv`}
                      className="button-secondary text-center"
                    >
                      CSV
                    </a>
                  ) : (
                    <div className="soft-panel flex items-center justify-center gap-2 px-3 py-2 text-xs text-ink/60">
                      <PremiumBadge />
                      CSV locked
                    </div>
                  )}
                  {canExportPdf(store.entitlements) ? (
                    <a
                      href={`/api/export/customer-ledger?customerId=${id}&format=pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="button-secondary text-center"
                    >
                      Print
                    </a>
                  ) : (
                    <div className="soft-panel flex items-center justify-center gap-2 px-3 py-2 text-xs text-ink/60">
                      <PremiumBadge />
                      PDF locked
                    </div>
                  )}
                </div>
                <SendReminderButton
                  customerId={id}
                  enabled={store.role === "OWNER" && Boolean(customer.phone)}
                />
                <ShareActions
                  customerId={id}
                  customerName={customer.name}
                  amount={currentBalance}
                />
              </div>
            </details>

            <div className="hidden stack-grid sm:grid-cols-2 xl:grid-cols-3 md:grid">
              {canExportCsv(store.entitlements) ? (
                <a
                  href={`/api/export/customer-ledger?customerId=${id}&format=csv`}
                  className="button-secondary text-center"
                >
                  Export CSV
                </a>
              ) : (
                <div className="soft-panel flex items-center justify-center gap-2 px-4 py-3 text-sm text-ink/60">
                  <PremiumBadge />
                  CSV limit reached
                </div>
              )}
              {canExportPdf(store.entitlements) ? (
                <a
                  href={`/api/export/customer-ledger?customerId=${id}&format=pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="button-secondary text-center"
                >
                  Open print view
                </a>
              ) : (
                <div className="soft-panel flex items-center justify-center gap-2 px-4 py-3 text-sm text-ink/60">
                  <PremiumBadge />
                  PDF export on Premium
                </div>
              )}
              <div className="xl:col-span-1">
                <SendReminderButton
                  customerId={id}
                  enabled={store.role === "OWNER" && Boolean(customer.phone)}
                />
              </div>
            </div>

            <div className="hidden md:block">
              <ShareActions
                customerId={id}
                customerName={customer.name}
                amount={currentBalance}
              />
            </div>
          </div>

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

          <div className="hidden overflow-x-auto md:block">
            <div className="ledger-grid-actions grid min-w-[720px] gap-3 rounded-2xl bg-paper px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">
              <div>Date</div>
              <div>Description</div>
              <div className="text-right">Baaki</div>
              <div className="text-right">Payment</div>
              <div className="text-right">Balance</div>
              <div className="text-center">Actions</div>
            </div>

            <div className="mt-2 space-y-2">
              {rows.length ? (
                rows.map((row) => (
                  <div
                    key={row.id}
                    className="ledger-grid-actions grid min-w-[720px] items-center gap-3 rounded-2xl border border-line bg-warm px-4 py-3"
                  >
                    <div className="text-sm text-ink/70">
                      {formatDate(row.created_at)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {row.description ||
                          (row.type === "BAAKI"
                            ? "Goods taken"
                            : "Payment made")}
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold text-khata">
                      {row.type === "BAAKI" ? formatCurrency(row.amount) : "-"}
                    </div>
                    <div className="text-right text-sm font-semibold text-moss">
                      {row.type === "PAYMENT" ? formatCurrency(row.amount) : "-"}
                    </div>
                    <div className="text-right text-sm font-semibold text-ink">
                      {formatCurrency(row.balance)}
                    </div>
                    <div className="text-center">
                      <DeleteLedgerEntryButton
                        entryId={row.id}
                        customerName={customer.name}
                      />
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href={`/customers/${id}?page=${Math.max(pagination.page - 1, 1)}&mode=${mode}`}
              className={`button-secondary w-auto text-center ${pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Prev
            </Link>
            <p className="text-xs text-ink/65 sm:text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <Link
              href={`/customers/${id}?page=${Math.min(pagination.page + 1, pagination.totalPages)}&mode=${mode}`}
              className={`button-secondary w-auto text-center ${
                pagination.page >= pagination.totalPages
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              Next
            </Link>
          </div>
        </CollapsibleSection>
      </div>

      <StickyMobileActionBar customerId={id} />
    </div>
  );
}
