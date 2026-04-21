import { calculateRiskIndicator } from "@/lib/risk";

export type CustomerInsights = {
  customer_id: string;
  last_payment_date: string | null;
  days_since_last_payment: number | null;
  total_baaki: number;
  payment_frequency: number | null;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
};

export type ReportRow = {
  bucket: string;
  total_baaki_added: number;
  total_payments_received: number;
  net_change: number;
};

export type TopDebtorRow = {
  customer_id: string;
  customer_name: string;
  total_baaki: number;
  longest_unpaid_days: number | null;
};

export type ForecastRow = {
  customer_id: string;
  customer_name: string;
  expected_payment_date: string | null;
  expected_amount: number;
  next_7_days_expected: number;
};

export type CashFlowForecast = {
  rows: ForecastRow[];
  next7DaysTotal: number;
};

export async function getCustomerInsights(
  supabase: any,
  customerId: string,
  threshold = 1000
): Promise<CustomerInsights> {
  const { data, error } = await supabase.rpc("get_customer_insights", {
    p_customer_id: customerId
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0] ?? {
    customer_id: customerId,
    last_payment_date: null,
    days_since_last_payment: null,
    total_baaki: 0,
    payment_frequency: null
  };

  const totalBaaki = Number(row.total_baaki ?? 0);
  const paymentFrequency = row.payment_frequency == null ? null : Number(row.payment_frequency);
  const risk = calculateRiskIndicator({
    daysSinceLastPayment: row.days_since_last_payment == null ? null : Number(row.days_since_last_payment),
    totalBaaki,
    threshold
  });

  return {
    customer_id: row.customer_id,
    last_payment_date: row.last_payment_date,
    days_since_last_payment:
      row.days_since_last_payment == null ? null : Number(row.days_since_last_payment),
    total_baaki: totalBaaki,
    payment_frequency: paymentFrequency,
    risk_score: Number(risk.score.toFixed(2)),
    risk_level: risk.level
  };
}

export async function getCustomerInsightsBatch(
  supabase: any,
  customerIds: string[],
  balances: Array<{ customer_id: string; balance: number }>,
  threshold = 1000,
): Promise<Map<string, CustomerInsights>> {
  const uniqueCustomerIds = [...new Set(customerIds.filter(Boolean))];
  const balanceMap = new Map(
    balances.map((customer) => [customer.customer_id, Number(customer.balance ?? 0)]),
  );

  if (!uniqueCustomerIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("customer_id, created_at")
    .in("customer_id", uniqueCustomerIds)
    .eq("type", "PAYMENT")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const paymentsByCustomer = new Map<string, string[]>();
  for (const row of data ?? []) {
    const existing = paymentsByCustomer.get(row.customer_id) ?? [];
    existing.push(row.created_at);
    paymentsByCustomer.set(row.customer_id, existing);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const insights = new Map<string, CustomerInsights>();
  for (const customerId of uniqueCustomerIds) {
    const paymentDates = paymentsByCustomer.get(customerId) ?? [];
    const lastPaymentDate = paymentDates.length ? paymentDates[paymentDates.length - 1] : null;
    const daysSinceLastPayment = lastPaymentDate
      ? Math.floor((today.getTime() - startOfDay(lastPaymentDate).getTime()) / 86_400_000)
      : null;

    let paymentFrequency: number | null = null;
    if (paymentDates.length >= 2) {
      let totalGapDays = 0;
      let gapCount = 0;

      for (let index = 1; index < paymentDates.length; index += 1) {
        const previous = new Date(paymentDates[index - 1]).getTime();
        const current = new Date(paymentDates[index]).getTime();
        totalGapDays += (current - previous) / 86_400_000;
        gapCount += 1;
      }

      paymentFrequency = Number((totalGapDays / gapCount).toFixed(2));
    }

    const totalBaaki = balanceMap.get(customerId) ?? 0;
    const risk = calculateRiskIndicator({
      daysSinceLastPayment,
      totalBaaki,
      threshold,
    });

    insights.set(customerId, {
      customer_id: customerId,
      last_payment_date: lastPaymentDate,
      days_since_last_payment: daysSinceLastPayment,
      total_baaki: totalBaaki,
      payment_frequency: paymentFrequency,
      risk_score: Number(risk.score.toFixed(2)),
      risk_level: risk.level,
    });
  }

  return insights;
}

function startOfDay(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getReports(
  supabase: any,
  period: "day" | "month" = "day",
  limit = 30,
): Promise<ReportRow[]> {
  const { data, error } = await supabase.rpc("get_store_daily_report", {
    p_period: period,
    p_limit: limit
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    bucket: row.bucket,
    total_baaki_added: Number(row.total_baaki_added ?? 0),
    total_payments_received: Number(row.total_payments_received ?? 0),
    net_change: Number(row.net_change ?? 0)
  }));
}

export async function getTopDebtors(supabase: any, limit = 5): Promise<TopDebtorRow[]> {
  const { data, error } = await supabase.rpc("get_top_debtors", {
    p_limit: limit
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    total_baaki: Number(row.total_baaki ?? 0),
    longest_unpaid_days: row.longest_unpaid_days == null ? null : Number(row.longest_unpaid_days)
  }));
}

export async function getCashFlowForecast(supabase: any): Promise<CashFlowForecast> {
  const { data, error } = await supabase.rpc("get_cash_flow_forecast");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row: any) => ({
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    expected_payment_date: row.expected_payment_date,
    expected_amount: Number(row.expected_amount ?? 0),
    next_7_days_expected: Number(row.next_7_days_expected ?? 0)
  }));

  return {
    rows,
    next7DaysTotal: rows.reduce(
      (sum: number, row: ForecastRow) => sum + row.next_7_days_expected,
      0,
    )
  };
}
