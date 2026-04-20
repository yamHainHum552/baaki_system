import Link from "next/link";
import { CustomerCardMenu } from "@/components/customer-card-menu";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatDays } from "@/lib/utils";

type CustomerListItem = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  days_since_last_payment: number | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | null;
};

export function CustomerListCard({
  customer,
  canManageCustomers,
}: {
  customer: CustomerListItem;
  canManageCustomers: boolean;
}) {
  return (
    <div className="soft-panel relative z-0 p-3 sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <Link href={`/customers/${customer.customer_id}`} className="min-w-0 flex-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-ink sm:text-xl">
                {customer.customer_name}
              </p>
              {customer.risk_level ? <RiskBadge level={customer.risk_level} compact /> : null}
            </div>
            <p className="mt-1.5 line-clamp-1 break-words text-xs text-ink/65 sm:text-sm">
              {[customer.phone, customer.address].filter(Boolean).join(" | ") || "No extra details"}
            </p>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
              <div>
                <p
                  className={`text-lg font-semibold sm:text-2xl ${
                    customer.balance >= 1000 ? "text-khata" : "text-ink"
                  }`}
                >
                  {formatCurrency(customer.balance)}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-ink/45">
                  Current baaki
                </p>
              </div>
              <p className="text-right text-[11px] uppercase tracking-[0.14em] text-ink/45">
                Last pay
                <span className="mt-0.5 block text-xs font-medium normal-case tracking-normal text-ink/70">
                  {formatDays(customer.days_since_last_payment)}
                </span>
              </p>
            </div>
          </div>
        </Link>

        <CustomerCardMenu
          customerId={customer.customer_id}
          customerPhone={customer.phone}
          canManageCustomers={canManageCustomers}
        />
      </div>
    </div>
  );
}
