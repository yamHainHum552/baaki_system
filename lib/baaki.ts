import { notFound } from "next/navigation";
import {
  getCashFlowForecast,
  getCustomerInsights,
  getReports,
  getTopDebtors,
  type CashFlowForecast,
  type ReportRow,
  type TopDebtorRow,
} from "@/lib/analytics";
import { withCache } from "@/lib/cache";
import {
  canAddMoreCustomers,
  canUseAdvancedReports,
  canUseForecast,
  getStoreEntitlements,
  type StoreEntitlements,
} from "@/lib/entitlements";
import { PremiumAccessError } from "@/lib/premium-errors";
import { calculateRiskIndicator } from "@/lib/risk";

export type CustomerBalance = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  baaki_total: number;
  payment_total: number;
  balance: number;
  last_entry_at: string | null;
  last_payment_date: string | null;
  days_since_last_payment: number | null;
  payment_frequency: number | null;
  risk_score: number | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | null;
};

export type LedgerRow = {
  id: string;
  created_at: string;
  description: string | null;
  type: "BAAKI" | "PAYMENT";
  amount: number;
  balance: number;
};

export type DashboardSummary = {
  totalBaaki: number;
  totalCustomers: number;
  highDueCount: number;
  customers: CustomerBalance[];
  dailyReport: ReportRow[];
  monthlyReport: ReportRow[];
  topDebtors: TopDebtorRow[];
  forecast: CashFlowForecast;
  entitlements: StoreEntitlements;
};

export async function listCustomersWithBalance(
  supabase: any,
  storeId: string,
  search?: string,
  riskThreshold = 1000
): Promise<CustomerBalance[]> {
  if (!search) {
    return withCache(`customers:${storeId}`, 20_000, async () =>
      fetchCustomersWithBalance(supabase, storeId, undefined, riskThreshold)
    );
  }

  return fetchCustomersWithBalance(supabase, storeId, search, riskThreshold);
}

async function fetchCustomersWithBalance(
  supabase: any,
  storeId: string,
  search: string | undefined,
  riskThreshold: number
) {
  let query = supabase
    .from("customer_balances")
    .select("*")
    .eq("store_id", storeId)
    .order("balance", { ascending: false })
    .order("customer_name", { ascending: true });

  if (search) {
    query = query.ilike("customer_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const customers = (data ?? []).map((row: any) => ({
    ...row,
    baaki_total: Number(row.baaki_total ?? 0),
    payment_total: Number(row.payment_total ?? 0),
    balance: Number(row.balance ?? 0)
  }));

  const insights = await Promise.all(
    customers.map((customer: CustomerBalance) =>
      getCustomerInsights(supabase, customer.customer_id, riskThreshold)
    )
  );

  return customers.map((customer: CustomerBalance, index: number) => ({
    ...customer,
    last_payment_date: insights[index].last_payment_date,
    days_since_last_payment: insights[index].days_since_last_payment,
    payment_frequency: insights[index].payment_frequency,
    risk_score: insights[index].risk_score,
    risk_level: insights[index].risk_level
  }));
}

export async function getDashboardSummary(
  supabase: any,
  storeId: string,
  riskThreshold = 1000,
  entitlements?: StoreEntitlements,
): Promise<DashboardSummary> {
  return withCache(`dashboard:${storeId}`, 30_000, async () => {
    const resolvedEntitlements = entitlements ?? (await getStoreEntitlements(supabase, storeId));
    const [customers, dailyReport, monthlyReport, topDebtors, forecast] = await Promise.all([
      listCustomersWithBalance(supabase, storeId, undefined, riskThreshold),
      canUseAdvancedReports(resolvedEntitlements) ? getReports(supabase, "day", 7) : Promise.resolve([]),
      canUseAdvancedReports(resolvedEntitlements) ? getReports(supabase, "month", 6) : Promise.resolve([]),
      canUseAdvancedReports(resolvedEntitlements) ? getTopDebtors(supabase, 5) : Promise.resolve([]),
      canUseForecast(resolvedEntitlements)
        ? getCashFlowForecast(supabase)
        : Promise.resolve({ rows: [], next7DaysTotal: 0 })
    ]);

    const totalBaaki = customers.reduce((sum, customer) => sum + customer.balance, 0);
    const highDueCustomers = customers.filter((customer) => customer.balance >= riskThreshold);

    return {
      totalBaaki,
      totalCustomers: customers.length,
      highDueCount: highDueCustomers.length,
      customers,
      dailyReport,
      monthlyReport,
      topDebtors,
      forecast,
      entitlements: resolvedEntitlements,
    };
  });
}

export async function getCustomerLedger(
  supabase: any,
  customerId: string,
  options?: { page?: number; pageSize?: number; riskThreshold?: number }
) {
  const pageSize = Math.max(options?.pageSize ?? 50, 1);
  const page = Math.max(options?.page ?? 1, 1);
  const offset = (page - 1) * pageSize;

  const [
    { data: customer, error: customerError },
    { data: ledgerRows, error: ledgerError },
    { count },
    insights
  ] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).single(),
      supabase.rpc("get_customer_ledger_page", {
        p_customer_id: customerId,
        p_limit: pageSize,
        p_offset: offset
      }),
      supabase
        .from("ledger_entries")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId),
      getCustomerInsights(supabase, customerId, options?.riskThreshold ?? 1000)
    ]);

  if (customerError?.code === "PGRST116") {
    notFound();
  }

  if (customerError) {
    throw new Error(customerError.message);
  }

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  const rows: LedgerRow[] = (ledgerRows ?? []).map((row: any) => ({
    ...row,
    amount: Number(row.amount),
    balance: Number(row.balance)
  })).reverse();

  const currentBalance = insights.total_baaki;

  return {
    customer,
    rows,
    currentBalance,
    insights,
    pagination: {
      page,
      pageSize,
      total: count ?? rows.length,
      totalPages: Math.max(Math.ceil((count ?? rows.length) / pageSize), 1)
    }
  };
}

export async function createCustomer(supabase: any, storeId: string, input: Record<string, unknown>) {
  const payload = {
    store_id: storeId,
    name: String(input.name ?? "").trim(),
    phone: String(input.phone ?? "").trim() || null,
    address: String(input.address ?? "").trim() || null
  };

  if (!payload.name) {
    throw new Error("Customer name is required.");
  }

  const entitlements = await getStoreEntitlements(supabase, storeId);
  if (!canAddMoreCustomers(entitlements)) {
    throw new PremiumAccessError(
      "PLAN_LIMIT_REACHED",
      `This plan allows up to ${entitlements.maxCustomers} customers.`,
      403,
      {
        feature: "add_customers",
        limit: entitlements.maxCustomers,
        used: entitlements.usage.customers_count,
      },
    );
  }

  const { data, error } = await supabase.from("customers").insert(payload).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createLedgerEntry(
  supabase: any,
  storeId: string,
  input: {
    customer_id: string;
    type: "BAAKI" | "PAYMENT";
    amount: number;
    description?: string;
    created_at: string;
  }
) {
  const payload = {
    store_id: storeId,
    customer_id: input.customer_id,
    type: input.type,
    amount: input.amount,
    description: input.description?.trim() || null,
    created_at: input.created_at
  };

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function getRiskSummary(customer: {
  balance: number;
  days_since_last_payment?: number | null;
  riskThreshold: number;
}) {
  return calculateRiskIndicator({
    daysSinceLastPayment: customer.days_since_last_payment ?? null,
    totalBaaki: customer.balance,
    threshold: customer.riskThreshold
  });
}
