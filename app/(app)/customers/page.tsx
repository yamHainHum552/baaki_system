import Link from "next/link";
import { CustomerListCard } from "@/components/customer-list-card";
import { CustomersToolbar } from "@/components/customers-toolbar";
import { CustomersResultsSummary } from "@/components/customers-results-summary";
import { listCustomersWithBalance } from "@/lib/baaki";
import { requireStoreContext } from "@/lib/auth";
import { hasStorePermission } from "@/lib/store-permissions";
import { formatCurrency } from "@/lib/utils";

type CustomerListItem = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  days_since_last_payment: number | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | null;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, store } = await requireStoreContext();
  const params = await searchParams;
  const query = String(params.q ?? "").trim();
  const customers = await listCustomersWithBalance(
    supabase,
    store.id,
    undefined,
    store.risk_threshold,
  );
  const canManageCustomers = hasStorePermission(
    store.role,
    store.permissions,
    "manage_customers",
  );
  const filteredCustomers = filterCustomers(customers, query);
  const totalDue = filteredCustomers.reduce((sum, customer) => sum + customer.balance, 0);

  return (
    <div className="section-spacing">
      <section className="surface-panel p-3.5 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition hover:bg-white"
            aria-label="Back to dashboard"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata">
              Customers
            </p>
            <h1 className="mt-1 font-serif text-xl text-ink sm:text-3xl">
              Customer list
            </h1>
          </div>

          <CustomersResultsSummary count={filteredCustomers.length} totalDue={totalDue} />
        </div>

        <CustomersToolbar initialQuery={query} canManageCustomers={canManageCustomers} />

        <CustomersResultsSummary count={filteredCustomers.length} totalDue={totalDue} mobile />
      </section>

      <section className="surface-panel p-2.5 sm:p-4">
        <div className="customer-list-stack space-y-2.5">
          {filteredCustomers.length ? (
            filteredCustomers.map((customer) => (
              <CustomerListCard
                key={customer.customer_id}
                customer={customer}
                canManageCustomers={canManageCustomers}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-line bg-paper px-4 py-10 text-center text-sm text-ink/65">
              No customer matched that search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function filterCustomers(customers: CustomerListItem[], query: string) {
  const term = query.trim().toLowerCase();

  if (!term) {
    return customers;
  }

  return [...customers]
    .map((customer) => ({
      customer,
      score: getCustomerSearchScore(customer, term),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.customer);
}

function getCustomerSearchScore(customer: CustomerListItem, term: string) {
  const tokens = term.split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return 1;
  }

  const name = customer.customer_name.toLowerCase();
  const phone = (customer.phone ?? "").toLowerCase();
  const address = (customer.address ?? "").toLowerCase();
  const risk = (customer.risk_level ?? "").toLowerCase();
  const balance = String(Math.round(customer.balance));

  let score = 0;

  for (const token of tokens) {
    if (name.startsWith(token)) {
      score += 10;
      continue;
    }

    if (name.includes(token)) {
      score += 7;
      continue;
    }

    if (phone.includes(token)) {
      score += 6;
      continue;
    }

    if (address.includes(token)) {
      score += 5;
      continue;
    }

    if (risk.includes(token)) {
      score += 4;
      continue;
    }

    if (balance.includes(token)) {
      score += 3;
      continue;
    }

    return 0;
  }

  return score;
}
