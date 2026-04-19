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
}>;

export function CustomerLedgerActions({
  customerId,
  customerName,
  currentBalance,
  canManageSms,
  hasPhone,
  entitlements,
  ReminderButton,
  ShareActions,
}: {
  customerId: string;
  customerName: string;
  currentBalance: number;
  canManageSms: boolean;
  hasPhone: boolean;
  entitlements: StoreEntitlements;
  ReminderButton: ReminderComponent;
  ShareActions: ShareComponent;
}) {
  return (
    <div id="ledger-actions" className="compact-section-spacing mb-4">
      <details className="rounded-[22px] border border-line bg-paper md:hidden">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-ink">
          More actions
        </summary>
        <div className="compact-section-spacing border-t border-line px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            {canExportCsv(entitlements) ? (
              <a
                href={`/api/export/customer-ledger?customerId=${customerId}&format=csv`}
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
            {canExportPdf(entitlements) ? (
              <a
                href={`/api/export/customer-ledger?customerId=${customerId}&format=pdf`}
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
          <ReminderButton
            customerId={customerId}
            enabled={canManageSms && hasPhone}
            access={entitlements.featureAccess.sms_reminders}
          />
          <ShareActions
            customerId={customerId}
            customerName={customerName}
            amount={currentBalance}
            access={entitlements.featureAccess.customer_share}
          />
        </div>
      </details>

      <div className="hidden stack-grid sm:grid-cols-2 xl:grid-cols-3 md:grid">
        {canExportCsv(entitlements) ? (
          <a
            href={`/api/export/customer-ledger?customerId=${customerId}&format=csv`}
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
        {canExportPdf(entitlements) ? (
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
            <PremiumBadge />
            PDF export on Premium
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

      <div className="hidden md:block">
        <ShareActions
          customerId={customerId}
          customerName={customerName}
          amount={currentBalance}
          access={entitlements.featureAccess.customer_share}
        />
      </div>
    </div>
  );
}
