import { PremiumBadge } from "@/components/premium-badge";
import type { FeatureAccess, StoreEntitlements } from "@/lib/entitlements";
import { canExportCsv, canExportPdf } from "@/lib/entitlements";

type ReminderComponent = React.ComponentType<{
  customerId: string;
  enabled: boolean;
  access: FeatureAccess;
}>;

type ShareComponent = React.ComponentType<{
  customerId: string;
  customerName: string;
  amount: number;
  access: FeatureAccess;
  enabled?: boolean;
  embedded?: boolean;
}>;

export function CustomerLedgerActions({
  insights,
  customerId,
  customerName,
  currentBalance,
  canManageSms,
  canExportLedger,
  canShareLedger,
  hasPhone,
  entitlements,
  ReminderButton,
  ShareActions,
}: {
  insights: Array<{
    label: string;
    value: string;
    tone?: "khata" | "moss" | "ink";
  }>;
  customerId: string;
  customerName: string;
  currentBalance: number;
  canManageSms: boolean;
  canExportLedger: boolean;
  canShareLedger: boolean;
  hasPhone: boolean;
  entitlements: StoreEntitlements;
  ReminderButton: ReminderComponent;
  ShareActions: ShareComponent;
}) {
  return (
    <div
      id="ledger-actions"
      className="compact-section-spacing rounded-[26px] border border-line/80 bg-paper/70 p-3 sm:p-4"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight) => (
          <div
            key={insight.label}
            className="rounded-[22px] border border-line/80 bg-white/80 px-3 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              {insight.label}
            </p>
            <p
              className={[
                "mt-2 text-sm font-semibold sm:text-[15px]",
                insight.tone === "khata"
                  ? "text-khata"
                  : insight.tone === "moss"
                    ? "text-moss"
                    : "text-ink",
              ].join(" ")}
            >
              {insight.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-line/75 bg-warm/55 p-2.5 sm:p-3">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {canExportCsv(entitlements) && canExportLedger ? (
          <a
            href={`/api/export/customer-ledger?customerId=${customerId}&format=csv`}
            className="button-secondary text-center"
          >
            Export CSV
          </a>
        ) : (
          <div className="soft-panel flex items-center justify-center gap-2 px-4 py-3 text-sm text-ink/60">
            {canExportLedger ? <PremiumBadge /> : null}
            {canExportLedger ? "CSV limit reached" : "Export not enabled"}
          </div>
        )}
        {canExportPdf(entitlements) && canExportLedger ? (
          <a
            href={`/api/export/customer-ledger?customerId=${customerId}&format=pdf`}
            target="_blank"
            rel="noreferrer"
            className="button-secondary text-center"
          >
            Open print view
          </a>
        ) : (
          <div className="soft-panel flex items-center justify-center gap-2 px-4 py-3 text-sm text-ink/60">
            {canExportLedger ? <PremiumBadge /> : null}
            {canExportLedger ? "PDF export on Premium" : "Export not enabled"}
          </div>
        )}
        <div className="xl:col-span-1">
          <ReminderButton
            customerId={customerId}
            enabled={canManageSms && hasPhone}
            access={entitlements.featureAccess.sms_reminders}
          />
        </div>
        </div>
      </div>

      <div>
        <ShareActions
          customerId={customerId}
          customerName={customerName}
          amount={currentBalance}
          access={entitlements.featureAccess.customer_share}
          enabled={canShareLedger}
          embedded
        />
      </div>
    </div>
  );
}
