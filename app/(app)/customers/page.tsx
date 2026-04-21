import Link from "next/link";
import { CustomerListCard } from "@/components/customer-list-card";
import { CustomersPagination } from "@/components/customers-pagination";
import { CustomersResultsSummary } from "@/components/customers-results-summary";
import { CustomersToolbar } from "@/components/customers-toolbar";
import { listCustomersPageWithBalance } from "@/lib/baaki";
import { requireStoreContext } from "@/lib/auth";
import { hasStorePermission } from "@/lib/store-permissions";

const CUSTOMERS_PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { supabase, store } = await requireStoreContext();
  const params = await searchParams;
  const query = String(params.q ?? "").trim();
  const page = Math.max(Number(params.page ?? "1") || 1, 1);

  const customerPage = await listCustomersPageWithBalance(supabase, store.id, {
    page,
    pageSize: CUSTOMERS_PAGE_SIZE,
    search: query || undefined,
    riskThreshold: store.risk_threshold,
  });

  const canManageCustomers = hasStorePermission(
    store.role,
    store.permissions,
    "manage_customers",
  );
  const totalDue = customerPage.customers.reduce(
    (sum, customer) => sum + customer.balance,
    0,
  );

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

          <CustomersResultsSummary count={customerPage.total} totalDue={totalDue} />
        </div>

        <CustomersToolbar initialQuery={query} canManageCustomers={canManageCustomers} />

        <CustomersResultsSummary count={customerPage.total} totalDue={totalDue} mobile />
      </section>

      <section className="surface-panel p-2.5 sm:p-4">
        <div className="customer-list-stack space-y-2.5">
          {customerPage.customers.length ? (
            customerPage.customers.map((customer) => (
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

        {customerPage.totalPages > 1 ? (
          <CustomersPagination
            page={customerPage.page}
            totalPages={customerPage.totalPages}
            query={query}
          />
        ) : null}
      </section>
    </div>
  );
}
