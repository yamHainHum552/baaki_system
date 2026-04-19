import { PremiumAccessError } from "@/lib/premium-errors";

export type PlanType = "free" | "premium_monthly" | "premium_yearly";
export type PlanStatus = "inactive" | "active" | "trialing" | "past_due" | "cancelled";
export type BillingCycle = "none" | "monthly" | "yearly";
export type FeatureName =
  | "sms_reminders"
  | "export_pdf"
  | "export_csv"
  | "customer_share"
  | "forecast"
  | "advanced_reports"
  | "add_customers"
  | "add_staff";

export type StoreSubscription = {
  store_id: string;
  legacy_plan: "FREE" | "PREMIUM";
  legacy_customer_limit: number;
  plan_type: PlanType;
  plan_status: PlanStatus;
  premium_enabled: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_starts_at: string | null;
  subscription_ends_at: string | null;
  grace_ends_at: string | null;
  billing_cycle: BillingCycle;
  max_customers: number;
  max_staff: number;
  max_sms_per_month: number;
  max_exports_per_month: number;
  max_share_links_per_month: number;
  feature_flags: Record<string, boolean>;
  billing_provider: string | null;
  provider_subscription_id: string | null;
};

export type StoreUsage = {
  usage_month: string;
  customers_count: number;
  staff_count: number;
  sms_sent_count: number;
  export_count: number;
  share_link_count: number;
};

export type FeatureAccess = {
  allowed: boolean;
  reason?: "feature_locked" | "plan_limit" | "trial_expired";
  limit?: number | null;
  used?: number;
  remaining?: number | null;
};

export type StoreEntitlements = {
  planType: PlanType;
  planStatus: PlanStatus;
  billingCycle: BillingCycle;
  premiumEnabled: boolean;
  isPremium: boolean;
  isTrialing: boolean;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  graceEndsAt: string | null;
  trialDaysRemaining: number | null;
  maxCustomers: number;
  maxStaff: number;
  maxSmsPerMonth: number;
  maxExportsPerMonth: number;
  maxShareLinksPerMonth: number;
  usage: StoreUsage;
  featureFlags: Record<string, boolean>;
  featureAccess: Record<FeatureName, FeatureAccess>;
  lockedFeatures: FeatureName[];
  displayPlanLabel: string;
  planBadgeLabel: string | null;
};

type PlanDefinition = {
  label: string;
  billingCycle: BillingCycle;
  limits: {
    customers: number;
    staff: number;
    smsPerMonth: number;
    exportsPerMonth: number;
    shareLinksPerMonth: number;
  };
  features: Record<FeatureName, boolean>;
};

export const TRIAL_DURATION_DAYS = 7;

export const PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
  free: {
    label: "Free",
    billingCycle: "none",
    limits: {
      customers: 50,
      staff: 1,
      smsPerMonth: 0,
      exportsPerMonth: 3,
      shareLinksPerMonth: 5,
    },
    features: {
      sms_reminders: false,
      export_pdf: false,
      export_csv: true,
      customer_share: true,
      forecast: false,
      advanced_reports: false,
      add_customers: true,
      add_staff: false,
    },
  },
  premium_monthly: {
    label: "Premium Monthly",
    billingCycle: "monthly",
    limits: {
      customers: 1000000,
      staff: 25,
      smsPerMonth: 250,
      exportsPerMonth: 1000,
      shareLinksPerMonth: 1000,
    },
    features: {
      sms_reminders: true,
      export_pdf: true,
      export_csv: true,
      customer_share: true,
      forecast: true,
      advanced_reports: true,
      add_customers: true,
      add_staff: true,
    },
  },
  premium_yearly: {
    label: "Premium Yearly",
    billingCycle: "yearly",
    limits: {
      customers: 1000000,
      staff: 25,
      smsPerMonth: 500,
      exportsPerMonth: 2000,
      shareLinksPerMonth: 2000,
    },
    features: {
      sms_reminders: true,
      export_pdf: true,
      export_csv: true,
      customer_share: true,
      forecast: true,
      advanced_reports: true,
      add_customers: true,
      add_staff: true,
    },
  },
};

export function buildDefaultSubscription(storeId: string): StoreSubscription {
  return {
    store_id: storeId,
    legacy_plan: "FREE",
    legacy_customer_limit: PLAN_DEFINITIONS.free.limits.customers,
    plan_type: "free",
    plan_status: "active",
    premium_enabled: false,
    trial_started_at: null,
    trial_ends_at: null,
    subscription_starts_at: null,
    subscription_ends_at: null,
    grace_ends_at: null,
    billing_cycle: "none",
    max_customers: PLAN_DEFINITIONS.free.limits.customers,
    max_staff: PLAN_DEFINITIONS.free.limits.staff,
    max_sms_per_month: PLAN_DEFINITIONS.free.limits.smsPerMonth,
    max_exports_per_month: PLAN_DEFINITIONS.free.limits.exportsPerMonth,
    max_share_links_per_month: PLAN_DEFINITIONS.free.limits.shareLinksPerMonth,
    feature_flags: {},
    billing_provider: null,
    provider_subscription_id: null,
  };
}

export function buildEmptyUsage(): StoreUsage {
  return {
    usage_month: currentUsageMonth(),
    customers_count: 0,
    staff_count: 1,
    sms_sent_count: 0,
    export_count: 0,
    share_link_count: 0,
  };
}

export async function getStoreSubscription(supabase: any, storeId: string): Promise<StoreSubscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "store_id, plan, customer_limit, plan_type, plan_status, premium_enabled, trial_started_at, trial_ends_at, subscription_starts_at, subscription_ends_at, grace_ends_at, billing_cycle, max_customers, max_staff, max_sms_per_month, max_exports_per_month, max_share_links_per_month, feature_flags, billing_provider, provider_subscription_id",
    )
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return buildDefaultSubscription(storeId);
  }

  const subscription = {
    store_id: data.store_id,
    legacy_plan: data.plan ?? "FREE",
    legacy_customer_limit: Number(data.customer_limit ?? PLAN_DEFINITIONS.free.limits.customers),
    plan_type: (data.plan_type ?? "free") as PlanType,
    plan_status: (data.plan_status ?? "active") as PlanStatus,
    premium_enabled: Boolean(data.premium_enabled),
    trial_started_at: data.trial_started_at ?? null,
    trial_ends_at: data.trial_ends_at ?? null,
    subscription_starts_at: data.subscription_starts_at ?? null,
    subscription_ends_at: data.subscription_ends_at ?? null,
    grace_ends_at: data.grace_ends_at ?? null,
    billing_cycle: (data.billing_cycle ?? "none") as BillingCycle,
    max_customers: Number(data.max_customers ?? data.customer_limit ?? PLAN_DEFINITIONS.free.limits.customers),
    max_staff: Number(data.max_staff ?? PLAN_DEFINITIONS.free.limits.staff),
    max_sms_per_month: Number(data.max_sms_per_month ?? PLAN_DEFINITIONS.free.limits.smsPerMonth),
    max_exports_per_month: Number(data.max_exports_per_month ?? PLAN_DEFINITIONS.free.limits.exportsPerMonth),
    max_share_links_per_month: Number(data.max_share_links_per_month ?? PLAN_DEFINITIONS.free.limits.shareLinksPerMonth),
    feature_flags: (data.feature_flags ?? {}) as Record<string, boolean>,
    billing_provider: data.billing_provider ?? null,
    provider_subscription_id: data.provider_subscription_id ?? null,
  } satisfies StoreSubscription;

  return subscription;
}

export async function getStoreUsageSnapshot(supabase: any, storeId: string): Promise<StoreUsage> {
  const [{ data: usageRow }, { count: customersCount }, { count: staffCount }] = await Promise.all([
    supabase
      .from("store_usage_counters")
      .select("usage_month, sms_sent_count, export_count, share_link_count")
      .eq("store_id", storeId)
      .eq("usage_month", currentUsageMonth())
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
    supabase
      .from("store_memberships")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
  ]);

  return {
    usage_month: usageRow?.usage_month ?? currentUsageMonth(),
    customers_count: customersCount ?? 0,
    staff_count: staffCount ?? 0,
    sms_sent_count: Number(usageRow?.sms_sent_count ?? 0),
    export_count: Number(usageRow?.export_count ?? 0),
    share_link_count: Number(usageRow?.share_link_count ?? 0),
  };
}

export async function incrementStoreUsage(
  supabase: any,
  storeId: string,
  metric: "sms" | "exports" | "share_links",
  amount = 1,
) {
  const { error } = await supabase.rpc("bump_store_usage", {
    p_store_id: storeId,
    p_metric: metric,
    p_amount: amount,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getStoreEntitlements(supabase: any, storeId: string): Promise<StoreEntitlements> {
  const [subscription, usage] = await Promise.all([
    getStoreSubscription(supabase, storeId),
    getStoreUsageSnapshot(supabase, storeId),
  ]);

  return resolveStoreEntitlements(subscription, usage);
}

export function resolveStoreEntitlements(
  subscription: StoreSubscription,
  usage: StoreUsage,
): StoreEntitlements {
  const planDefinition = PLAN_DEFINITIONS[subscription.plan_type] ?? PLAN_DEFINITIONS.free;
  const now = new Date();
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const graceEndsAt = subscription.grace_ends_at ? new Date(subscription.grace_ends_at) : null;
  const trialActive = subscription.plan_status === "trialing" && trialEndsAt != null && trialEndsAt > now;
  const trialExpired = subscription.plan_status === "trialing" && trialEndsAt != null && trialEndsAt <= now;
  const premiumByPlan =
    subscription.plan_status === "active" &&
    (subscription.plan_type === "premium_monthly" || subscription.plan_type === "premium_yearly") &&
    subscription.premium_enabled;
  const premiumDuringGrace =
    subscription.plan_status === "past_due" && graceEndsAt != null && graceEndsAt > now;
  const isPremium = trialActive || premiumByPlan || premiumDuringGrace;
  const effectivePlanDefinition = trialActive
    ? PLAN_DEFINITIONS.premium_monthly
    : isPremium
      ? planDefinition
      : PLAN_DEFINITIONS.free;
  const baseFeatures = effectivePlanDefinition.features;
  const effectiveLimits = {
    customers: trialActive ? PLAN_DEFINITIONS.premium_monthly.limits.customers : isPremium ? subscription.max_customers : PLAN_DEFINITIONS.free.limits.customers,
    staff: trialActive ? PLAN_DEFINITIONS.premium_monthly.limits.staff : isPremium ? subscription.max_staff : PLAN_DEFINITIONS.free.limits.staff,
    smsPerMonth: trialActive ? PLAN_DEFINITIONS.premium_monthly.limits.smsPerMonth : isPremium ? subscription.max_sms_per_month : PLAN_DEFINITIONS.free.limits.smsPerMonth,
    exportsPerMonth: trialActive ? PLAN_DEFINITIONS.premium_monthly.limits.exportsPerMonth : isPremium ? subscription.max_exports_per_month : PLAN_DEFINITIONS.free.limits.exportsPerMonth,
    shareLinksPerMonth: trialActive ? PLAN_DEFINITIONS.premium_monthly.limits.shareLinksPerMonth : isPremium ? subscription.max_share_links_per_month : PLAN_DEFINITIONS.free.limits.shareLinksPerMonth,
  };

  const flags = subscription.feature_flags ?? {};
  const customerRemaining = toRemaining(effectiveLimits.customers, usage.customers_count);
  const staffRemaining = toRemaining(effectiveLimits.staff, usage.staff_count);
  const smsRemaining = toRemaining(effectiveLimits.smsPerMonth, usage.sms_sent_count);
  const exportRemaining = toRemaining(effectiveLimits.exportsPerMonth, usage.export_count);
  const shareRemaining = toRemaining(effectiveLimits.shareLinksPerMonth, usage.share_link_count);

  const featureAccess: Record<FeatureName, FeatureAccess> = {
    sms_reminders: resolveFeatureAccess(Boolean(baseFeatures.sms_reminders || flags.sms_reminders), smsRemaining, effectiveLimits.smsPerMonth, usage.sms_sent_count, trialExpired),
    export_pdf: resolveFeatureAccess(Boolean(baseFeatures.export_pdf || flags.export_pdf), exportRemaining, effectiveLimits.exportsPerMonth, usage.export_count, trialExpired),
    export_csv: resolveFeatureAccess(Boolean(baseFeatures.export_csv || flags.export_csv), exportRemaining, effectiveLimits.exportsPerMonth, usage.export_count, trialExpired),
    customer_share: resolveFeatureAccess(Boolean(baseFeatures.customer_share || flags.customer_share), shareRemaining, effectiveLimits.shareLinksPerMonth, usage.share_link_count, trialExpired),
    forecast: resolveFeatureAccess(Boolean(baseFeatures.forecast || flags.forecast), null, null, 0, trialExpired),
    advanced_reports: resolveFeatureAccess(Boolean(baseFeatures.advanced_reports || flags.advanced_reports), null, null, 0, trialExpired),
    add_customers: resolveFeatureAccess(Boolean(baseFeatures.add_customers || flags.add_customers), customerRemaining, effectiveLimits.customers, usage.customers_count, trialExpired),
    add_staff: resolveFeatureAccess(Boolean(baseFeatures.add_staff || flags.add_staff), staffRemaining, effectiveLimits.staff, usage.staff_count, trialExpired),
  };

  const lockedFeatures = (Object.keys(featureAccess) as FeatureName[]).filter(
    (feature) => !featureAccess[feature].allowed,
  );

  return {
    planType: subscription.plan_type,
    planStatus: trialExpired ? "inactive" : subscription.plan_status,
    billingCycle: subscription.billing_cycle,
    premiumEnabled: subscription.premium_enabled,
    isPremium,
    isTrialing: trialActive,
    trialStartsAt: subscription.trial_started_at,
    trialEndsAt: subscription.trial_ends_at,
    subscriptionStartsAt: subscription.subscription_starts_at,
    subscriptionEndsAt: subscription.subscription_ends_at,
    graceEndsAt: subscription.grace_ends_at,
    trialDaysRemaining: trialEndsAt && trialEndsAt > now ? diffInWholeDays(now, trialEndsAt) : null,
    maxCustomers: effectiveLimits.customers,
    maxStaff: effectiveLimits.staff,
    maxSmsPerMonth: effectiveLimits.smsPerMonth,
    maxExportsPerMonth: effectiveLimits.exportsPerMonth,
    maxShareLinksPerMonth: effectiveLimits.shareLinksPerMonth,
    usage,
    featureFlags: flags,
    featureAccess,
    lockedFeatures,
    displayPlanLabel: trialActive ? "Free Trial" : isPremium ? planDefinition.label : PLAN_DEFINITIONS.free.label,
    planBadgeLabel: isPremium ? "Premium" : null,
  };
}

export async function requireFeatureAccess(input: {
  supabase: any;
  storeId: string;
  feature: FeatureName;
}) {
  const entitlements = await getStoreEntitlements(input.supabase, input.storeId);
  const access = entitlements.featureAccess[input.feature];

  if (!access.allowed) {
    if (access.reason === "plan_limit") {
      throw new PremiumAccessError(
        "PLAN_LIMIT_REACHED",
        buildFeatureMessage(input.feature, "limit"),
        403,
        { feature: input.feature, limit: access.limit ?? null, used: access.used ?? 0 },
      );
    }

    if (access.reason === "trial_expired") {
      throw new PremiumAccessError(
        "TRIAL_EXPIRED",
        buildFeatureMessage(input.feature, "trial"),
        403,
        { feature: input.feature },
      );
    }

    throw new PremiumAccessError(
      "FEATURE_LOCKED",
      buildFeatureMessage(input.feature, "locked"),
      403,
      { feature: input.feature },
    );
  }

  return entitlements;
}

export async function requireOwnerBillingAccess(input: {
  role: "OWNER" | "STAFF";
  supabase: any;
  storeId: string;
}) {
  if (input.role !== "OWNER") {
    throw new PremiumAccessError("OWNER_ONLY", "Only owners can manage billing settings.", 403);
  }

  return getStoreEntitlements(input.supabase, input.storeId);
}

export function canUseSmsReminders(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.sms_reminders.allowed;
}

export function canExportPdf(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.export_pdf.allowed;
}

export function canExportCsv(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.export_csv.allowed;
}

export function canUseCustomerShare(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.customer_share.allowed;
}

export function canUseForecast(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.forecast.allowed;
}

export function canUseAdvancedReports(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.advanced_reports.allowed;
}

export function canAddMoreCustomers(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.add_customers.allowed;
}

export function canAddMoreStaff(entitlements: StoreEntitlements) {
  return entitlements.featureAccess.add_staff.allowed;
}

export function currentUsageMonth(date = new Date()) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-01`;
}

function resolveFeatureAccess(
  enabled: boolean,
  remaining: number | null,
  limit: number | null,
  used: number,
  trialExpired: boolean,
): FeatureAccess {
  if (trialExpired) {
    return {
      allowed: false,
      reason: "trial_expired",
      limit,
      used,
      remaining,
    };
  }

  if (!enabled) {
    return {
      allowed: false,
      reason: "feature_locked",
      limit,
      used,
      remaining,
    };
  }

  if (remaining != null && remaining <= 0) {
    return {
      allowed: false,
      reason: "plan_limit",
      limit,
      used,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    limit,
    used,
    remaining,
  };
}

function toRemaining(limit: number, used: number) {
  if (limit >= 1000000) {
    return null;
  }

  return limit - used;
}

function diffInWholeDays(from: Date, to: Date) {
  return Math.max(Math.ceil((to.getTime() - from.getTime()) / 86400000), 0);
}

function buildFeatureMessage(feature: FeatureName, kind: "locked" | "limit" | "trial") {
  const labels: Record<FeatureName, string> = {
    sms_reminders: "SMS reminders",
    export_pdf: "PDF export",
    export_csv: "CSV export",
    customer_share: "Customer share links",
    forecast: "Cash-flow forecast",
    advanced_reports: "Advanced reports",
    add_customers: "Customer limit",
    add_staff: "Staff limit",
  };

  if (kind === "limit") {
    return `${labels[feature]} limit reached for this plan.`;
  }

  if (kind === "trial") {
    return `Trial access has expired for ${labels[feature].toLowerCase()}.`;
  }

  return `${labels[feature]} is available on Premium.`;
}
