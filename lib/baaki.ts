import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCashFlowForecast,
  getCustomerInsights,
  getCustomerInsightsBatch,
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
import { filterCustomers } from "@/lib/customer-search";

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
  customer_created_at?: string | null;
};

export type LedgerRow = {
  id: string;
  created_at: string;
  description: string | null;
  type: "BAAKI" | "PAYMENT";
  amount: number;
  balance: number;
};

export type LedgerAuditEvent = {
  id: string;
  action: string;
  created_at: string;
  actor_user_id: string | null;
  details: Record<string, unknown>;
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

export type MultiStoreOverview = {
  stores: Array<{
    storeId: string;
    storeName: string;
    planType: "free" | "premium_monthly" | "premium_yearly";
    totalCustomers: number;
    totalBaaki: number;
    highDueCount: number;
    lastEntryAt: string | null;
    isCurrentStore: boolean;
  }>;
  totalCustomers: number;
  totalBaaki: number;
  highDueCount: number;
};

export type CustomerPageResult = {
  customers: CustomerBalance[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listCustomersWithBalance(
  supabase: any,
  storeId: string,
  search?: string,
  riskThreshold = 1000
): Promise<CustomerBalance[]> {
  if (!search) {
    return withCache(`customers:${storeId}:all`, 20_000, async () =>
      fetchCustomersWithBalance(supabase, storeId, undefined, riskThreshold)
    );
  }

  return fetchCustomersWithBalance(supabase, storeId, search, riskThreshold);
}

export async function listCustomersPageWithBalance(
  supabase: any,
  storeId: string,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    riskThreshold?: number;
  },
): Promise<CustomerPageResult> {
  const page = Math.max(options?.page ?? 1, 1);
  const pageSize = Math.max(options?.pageSize ?? 20, 1);
  const search = options?.search?.trim() || undefined;
  const riskThreshold = options?.riskThreshold ?? 1000;
  const normalizedSearch = search?.toLowerCase() ?? "";

  if (!search) {
    return withCache(`customers:${storeId}:page:${page}:${pageSize}`, 20_000, async () =>
      fetchCustomersPageWithoutSearch(supabase, storeId, {
        page,
        pageSize,
        riskThreshold,
      }),
    );
  }

  return withCache(
    `customers:${storeId}:search:${encodeURIComponent(normalizedSearch)}:page:${page}:${pageSize}`,
    20_000,
    async () =>
      fetchCustomersPageWithSearch(supabase, storeId, {
        page,
        pageSize,
        search,
        riskThreshold,
      }),
  );
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
    .order("last_entry_at", { ascending: false, nullsFirst: false })
    .order("customer_name", { ascending: true });

  if (search) {
    query = query.ilike("customer_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const customerRows = (data ?? []).map((row: any) => ({
    ...row,
    baaki_total: Number(row.baaki_total ?? 0),
    payment_total: Number(row.payment_total ?? 0),
    balance: Number(row.balance ?? 0)
  }));

  const customerIds = customerRows.map((row: CustomerBalance) => row.customer_id);
  const createdAtMap = new Map<string, string | null>();

  if (customerIds.length > 0) {
    const { data: customerMeta, error: customerMetaError } = await supabase
      .from("customers")
      .select("id, created_at")
      .in("id", customerIds);

    if (customerMetaError) {
      throw new Error(customerMetaError.message);
    }

    for (const row of customerMeta ?? []) {
      createdAtMap.set(row.id, row.created_at ?? null);
    }
  }

  const customers = customerRows
    .map((row: CustomerBalance) => ({
      ...row,
      customer_created_at: createdAtMap.get(row.customer_id) ?? null,
    }))
    .sort((left: CustomerBalance, right: CustomerBalance) => {
      const leftTimestamp = left.last_entry_at ?? left.customer_created_at ?? null;
      const rightTimestamp = right.last_entry_at ?? right.customer_created_at ?? null;

      if (leftTimestamp && rightTimestamp) {
        const timeDiff = new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }
      } else if (rightTimestamp) {
        return 1;
      } else if (leftTimestamp) {
        return -1;
      }

      return left.customer_name.localeCompare(right.customer_name);
    });

  return addCustomerInsights(supabase, customers, riskThreshold);
}

async function fetchCustomersPageWithoutSearch(
  supabase: any,
  storeId: string,
  options: {
    page: number;
    pageSize: number;
    riskThreshold: number;
  },
): Promise<CustomerPageResult> {
  const { data, error } = await supabase.rpc("get_customer_page", {
    p_store_id: storeId,
    p_page: options.page,
    p_page_size: options.pageSize,
  });

  if (error) {
    throw new Error(error.message);
  }

  const customers = mapRpcCustomers(data ?? [], options.riskThreshold);
  const total = Number(data?.[0]?.total_count ?? 0);
  return {
    customers,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.max(Math.ceil(total / options.pageSize), 1),
  };
}

async function fetchCustomersPageWithSearch(
  supabase: any,
  storeId: string,
  options: {
    page: number;
    pageSize: number;
    search: string;
    riskThreshold: number;
  },
): Promise<CustomerPageResult> {
  const candidates = await withCache(
    `customers:${storeId}:search-base:${encodeURIComponent(options.search.toLowerCase())}`,
    20_000,
    async () => fetchCustomerSearchCandidates(supabase, storeId, options.search, options.riskThreshold),
  );

  const filteredCustomers = filterCustomers(candidates, options.search);
  const total = filteredCustomers.length;
  const offset = (options.page - 1) * options.pageSize;
  const customers = filteredCustomers.slice(offset, offset + options.pageSize);

  return {
    customers,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.max(Math.ceil(total / options.pageSize), 1),
  };
}

async function fetchCustomerSearchCandidates(
  supabase: any,
  storeId: string,
  search: string,
  riskThreshold: number,
) {
  const { data, error } = await supabase.rpc("search_customer_candidates", {
    p_store_id: storeId,
    p_query: search,
    p_limit: 240,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapRpcCustomers(data ?? [], riskThreshold);
}

function mapRpcCustomers(rows: any[], riskThreshold: number) {
  return rows.map((row) => {
    const balance = Number(row.balance ?? 0);
    const daysSinceLastPayment =
      row.days_since_last_payment == null ? null : Number(row.days_since_last_payment);
    const risk = calculateRiskIndicator({
      daysSinceLastPayment,
      totalBaaki: balance,
      threshold: riskThreshold,
    });

    return {
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      phone: row.phone ?? null,
      address: row.address ?? null,
      baaki_total: Number(row.baaki_total ?? 0),
      payment_total: Number(row.payment_total ?? 0),
      balance,
      last_entry_at: row.last_entry_at ?? null,
      customer_created_at: row.customer_created_at ?? null,
      last_payment_date: row.last_payment_date ?? null,
      days_since_last_payment: daysSinceLastPayment,
      payment_frequency: row.payment_frequency == null ? null : Number(row.payment_frequency),
      risk_score: Number(risk.score.toFixed(2)),
      risk_level: risk.level,
    } satisfies CustomerBalance;
  });
}

async function enrichCustomersWithBalancesAndInsights(
  supabase: any,
  customerRows: Array<{
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    created_at: string | null;
  }>,
  riskThreshold: number,
) {
  const balanceRows = customerRows.length
    ? await fetchBalanceRowsForCustomerIds(
        supabase,
        customerRows.map((row) => row.id),
      )
    : [];

  const mergedCustomers = mergeCustomersWithBalances(customerRows, balanceRows);
  return addCustomerInsights(supabase, mergedCustomers, riskThreshold);
}

async function fetchBalanceRowsForCustomerIds(supabase: any, customerIds: string[]) {
  const { data, error } = await supabase
    .from("customer_balances")
    .select("customer_id, baaki_total, payment_total, balance, last_entry_at")
    .in("customer_id", customerIds);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function mergeCustomersWithBalances(
  customerRows: Array<{
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    created_at: string | null;
  }>,
  balanceRows: Array<{
    customer_id: string;
    baaki_total?: number | string | null;
    payment_total?: number | string | null;
    balance?: number | string | null;
    last_entry_at?: string | null;
  }>,
) {
  const balanceMap = new Map(
    balanceRows.map((row) => [
      row.customer_id,
      {
        baaki_total: Number(row.baaki_total ?? 0),
        payment_total: Number(row.payment_total ?? 0),
        balance: Number(row.balance ?? 0),
        last_entry_at: row.last_entry_at ?? null,
      },
    ]),
  );

  return customerRows.map((row) => {
    const balanceRow = balanceMap.get(row.id);

    return {
      customer_id: row.id,
      customer_name: row.name,
      phone: row.phone ?? null,
      address: row.address ?? null,
      baaki_total: balanceRow?.baaki_total ?? 0,
      payment_total: balanceRow?.payment_total ?? 0,
      balance: balanceRow?.balance ?? 0,
      last_entry_at: balanceRow?.last_entry_at ?? null,
      last_payment_date: null,
      days_since_last_payment: null,
      payment_frequency: null,
      risk_score: null,
      risk_level: null,
      customer_created_at: row.created_at ?? null,
    } satisfies CustomerBalance;
  });
}

async function addCustomerInsights(
  supabase: any,
  customers: CustomerBalance[],
  riskThreshold: number,
) {
  const insightsMap = await getCustomerInsightsBatch(
    supabase,
    customers.map((customer) => customer.customer_id),
    customers.map((customer) => ({
      customer_id: customer.customer_id,
      balance: customer.balance,
    })),
    riskThreshold,
  );

  return customers.map((customer) => {
    const insights = insightsMap.get(customer.customer_id);

    if (!insights) {
      return customer;
    }

    return {
    ...customer,
      last_payment_date: insights.last_payment_date,
      days_since_last_payment: insights.days_since_last_payment,
      payment_frequency: insights.payment_frequency,
      risk_score: insights.risk_score,
      risk_level: insights.risk_level,
    };
  });
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
  }));

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

export async function getCustomerLedgerAuditEvents(supabase: any, customerId: string) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, actor_user_id, details")
    .eq("entity_type", "ledger_entry")
    .filter("details->>customer_id", "eq", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LedgerAuditEvent[];
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

export async function getOwnedStoresOverview(userId: string, currentStoreId: string) {
  const adminClient = createAdminClient();
  const { data: memberships, error: membershipError } = await adminClient
    .from("store_memberships")
    .select("store_id, role, stores(id, name, risk_threshold)")
    .eq("user_id", userId)
    .eq("role", "OWNER");

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const rows = (memberships ?? []).filter(
    (membership: any) => membership.stores && !Array.isArray(membership.stores),
  );
  const storeIds = rows.map((membership: any) => membership.store_id);

  if (!storeIds.length) {
    return null;
  }

  const [{ data: balances, error: balanceError }, { data: subscriptions, error: subscriptionError }] =
    await Promise.all([
      adminClient
        .from("customer_balances")
        .select("store_id, balance, last_entry_at")
        .in("store_id", storeIds),
      adminClient
        .from("subscriptions")
        .select("store_id, plan_type")
        .in("store_id", storeIds),
    ]);

  if (balanceError) {
    throw new Error(balanceError.message);
  }
  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  const balanceGroups = new Map<string, Array<{ balance: number; last_entry_at: string | null }>>();
  for (const row of balances ?? []) {
    const current = balanceGroups.get(row.store_id) ?? [];
    current.push({
      balance: Number(row.balance ?? 0),
      last_entry_at: row.last_entry_at ?? null,
    });
    balanceGroups.set(row.store_id, current);
  }
  const subscriptionMap = new Map((subscriptions ?? []).map((row) => [row.store_id, row.plan_type]));

  const stores = rows.map((membership: any) => {
    const balancesForStore = balanceGroups.get(membership.store_id) ?? [];
    const riskThreshold = Number(membership.stores.risk_threshold ?? 1000);
    const lastEntryAt = balancesForStore.reduce<string | null>((latest, row) => {
      if (!row.last_entry_at) {
        return latest;
      }

      if (!latest || new Date(row.last_entry_at).getTime() > new Date(latest).getTime()) {
        return row.last_entry_at;
      }

      return latest;
    }, null);

    return {
      storeId: membership.store_id,
      storeName: membership.stores.name,
      planType: (subscriptionMap.get(membership.store_id) ?? "free") as "free" | "premium_monthly" | "premium_yearly",
      totalCustomers: balancesForStore.length,
      totalBaaki: balancesForStore.reduce((sum, row) => sum + row.balance, 0),
      highDueCount: balancesForStore.filter((row) => row.balance >= riskThreshold).length,
      lastEntryAt,
      isCurrentStore: membership.store_id === currentStoreId,
    };
  });

  return {
    stores,
    totalCustomers: stores.reduce((sum, store) => sum + store.totalCustomers, 0),
    totalBaaki: stores.reduce((sum, store) => sum + store.totalBaaki, 0),
    highDueCount: stores.reduce((sum, store) => sum + store.highDueCount, 0),
  } satisfies MultiStoreOverview;
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
