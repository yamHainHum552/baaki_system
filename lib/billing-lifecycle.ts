import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_DEFINITIONS, getStoreSubscription, type StoreSubscription } from "@/lib/entitlements";

const DEFAULT_BILLING_GRACE_DAYS = Number(process.env.BILLING_GRACE_DAYS ?? 3);

type LifecycleAction =
  | "trial_expired_downgraded"
  | "subscription_marked_past_due"
  | "subscription_grace_expired_downgraded";

type LifecycleResult = {
  storeId: string;
  action: LifecycleAction;
  planType: StoreSubscription["plan_type"];
  previousStatus: StoreSubscription["plan_status"];
  nextStatus: StoreSubscription["plan_status"];
  graceEndsAt?: string | null;
};

export async function processBillingLifecycle(options?: { limit?: number }) {
  const adminClient = createAdminClient();
  const limit = Math.max(options?.limit ?? 100, 1);

  const { data, error } = await adminClient
    .from("subscriptions")
    .select("store_id")
    .or("plan_status.eq.trialing,plan_status.eq.active,plan_status.eq.past_due")
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const results: LifecycleResult[] = [];
  for (const row of data ?? []) {
    const subscription = await getStoreSubscription(adminClient, row.store_id);
    const result = await syncStoreBillingLifecycle(adminClient, subscription);
    if (result) {
      results.push(result);
    }
  }

  return {
    processed: (data ?? []).length,
    changed: results.length,
    results,
  };
}

export async function syncStoreBillingLifecycle(
  adminClient: ReturnType<typeof createAdminClient>,
  subscription: StoreSubscription,
) {
  const transition = getLifecycleTransition(subscription, new Date(), DEFAULT_BILLING_GRACE_DAYS);
  if (!transition) {
    return null;
  }

  if (transition.action === "subscription_marked_past_due") {
    const { error } = await adminClient
      .from("subscriptions")
      .update({
        plan_status: "past_due",
        premium_enabled: true,
        grace_ends_at: transition.graceEndsAt,
        last_provider_event_at: new Date().toISOString(),
      })
      .eq("store_id", subscription.store_id);

    if (error) {
      throw new Error(error.message);
    }

    await logBillingLifecycleEvent(adminClient, subscription.store_id, "SUBSCRIPTION_MARKED_PAST_DUE", {
      previous_status: subscription.plan_status,
      grace_ends_at: transition.graceEndsAt,
      subscription_ends_at: subscription.subscription_ends_at,
      billing_provider: subscription.billing_provider,
    });

    return {
      storeId: subscription.store_id,
      action: transition.action,
      planType: subscription.plan_type,
      previousStatus: subscription.plan_status,
      nextStatus: "past_due",
      graceEndsAt: transition.graceEndsAt,
    } satisfies LifecycleResult;
  }

  const freePlan = PLAN_DEFINITIONS.free;
  const { error } = await adminClient
    .from("subscriptions")
    .update({
      plan: "FREE",
      customer_limit: freePlan.limits.customers,
      plan_type: "free",
      plan_status: "active",
      premium_enabled: false,
      billing_cycle: "none",
      subscription_starts_at: null,
      subscription_ends_at: null,
      grace_ends_at: null,
      max_customers: freePlan.limits.customers,
      max_staff: freePlan.limits.staff,
      max_sms_per_month: freePlan.limits.smsPerMonth,
      max_exports_per_month: freePlan.limits.exportsPerMonth,
      max_share_links_per_month: freePlan.limits.shareLinksPerMonth,
      last_provider_event_at: new Date().toISOString(),
    })
    .eq("store_id", subscription.store_id);

  if (error) {
    throw new Error(error.message);
  }

  const eventName =
    transition.action === "trial_expired_downgraded"
      ? "TRIAL_EXPIRED_DOWNGRADED"
      : "SUBSCRIPTION_GRACE_EXPIRED_DOWNGRADED";

  await logBillingLifecycleEvent(adminClient, subscription.store_id, eventName, {
    previous_plan_type: subscription.plan_type,
    previous_status: subscription.plan_status,
    billing_provider: subscription.billing_provider,
    subscription_ends_at: subscription.subscription_ends_at,
    grace_ends_at: subscription.grace_ends_at,
  });

  return {
    storeId: subscription.store_id,
    action: transition.action,
    planType: subscription.plan_type,
    previousStatus: subscription.plan_status,
    nextStatus: "active",
    graceEndsAt: null,
  } satisfies LifecycleResult;
}

function getLifecycleTransition(
  subscription: StoreSubscription,
  now: Date,
  graceDays: number,
) {
  const trialEndsAt = parseDate(subscription.trial_ends_at);
  if (subscription.plan_status === "trialing" && trialEndsAt && trialEndsAt <= now) {
    return {
      action: "trial_expired_downgraded" as const,
    };
  }

  const subscriptionEndsAt = parseDate(subscription.subscription_ends_at);
  const graceEndsAt = parseDate(subscription.grace_ends_at);
  const isPaidPlan =
    subscription.plan_type === "premium_monthly" || subscription.plan_type === "premium_yearly";

  if (
    isPaidPlan &&
    subscription.plan_status === "active" &&
    subscriptionEndsAt &&
    subscriptionEndsAt <= now
  ) {
    if (graceDays > 0) {
      return {
        action: "subscription_marked_past_due" as const,
        graceEndsAt: addDays(now, graceDays).toISOString(),
      };
    }

    return {
      action: "subscription_grace_expired_downgraded" as const,
    };
  }

  if (
    isPaidPlan &&
    subscription.plan_status === "past_due" &&
    (!graceEndsAt || graceEndsAt <= now)
  ) {
    return {
      action: "subscription_grace_expired_downgraded" as const,
    };
  }

  return null;
}

async function logBillingLifecycleEvent(
  adminClient: ReturnType<typeof createAdminClient>,
  storeId: string,
  action: string,
  details: Record<string, unknown>,
) {
  const { error } = await adminClient.rpc("log_subscription_event", {
    p_store_id: storeId,
    p_action: action,
    p_details: details,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function parseDate(value: string | null) {
  return value ? new Date(value) : null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
