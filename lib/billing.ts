import { PremiumAccessError } from "@/lib/premium-errors";

export type BillingProviderName = "manual" | "stripe" | "khalti" | "esewa";

export interface SubscriptionProvider {
  name: BillingProviderName;
  syncSubscription(input: {
    storeId: string;
    planType: string;
    planStatus: string;
    providerSubscriptionId?: string | null;
  }): Promise<void>;
}

class NoopSubscriptionProvider implements SubscriptionProvider {
  name: BillingProviderName;

  constructor(name: BillingProviderName) {
    this.name = name;
  }

  async syncSubscription() {
    return;
  }
}

export function getSubscriptionProvider(provider?: string | null): SubscriptionProvider {
  const normalized = (provider ?? "manual").toLowerCase() as BillingProviderName;
  return new NoopSubscriptionProvider(normalized);
}

export async function logSubscriptionEvent(
  supabase: any,
  storeId: string,
  action: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabase.rpc("log_subscription_event", {
    p_store_id: storeId,
    p_action: action,
    p_details: details,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function startStoreTrial(
  supabase: any,
  storeId: string,
  durationDays: number,
  role: "OWNER" | "STAFF",
) {
  if (role !== "OWNER") {
    throw new PremiumAccessError("OWNER_ONLY", "Only owners can start a free trial.", 403);
  }

  const { data, error } = await supabase.rpc("start_store_trial", {
    p_duration_days: durationDays,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateStoreSubscriptionState(
  supabase: any,
  input: {
    storeId: string;
    planType: "free" | "premium_monthly" | "premium_yearly";
    planStatus: "inactive" | "active" | "trialing" | "past_due" | "cancelled";
    premiumEnabled: boolean;
    billingCycle: "none" | "monthly" | "yearly";
    subscriptionEndsAt?: string | null;
    graceEndsAt?: string | null;
    billingProvider?: string | null;
    providerSubscriptionId?: string | null;
  },
) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_type: input.planType,
      plan_status: input.planStatus,
      premium_enabled: input.premiumEnabled,
      billing_cycle: input.billingCycle,
      subscription_ends_at: input.subscriptionEndsAt ?? null,
      grace_ends_at: input.graceEndsAt ?? null,
      billing_provider: input.billingProvider ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      plan:
        input.planType === "free"
          ? "FREE"
          : "PREMIUM",
    })
    .eq("store_id", input.storeId);

  if (error) {
    throw new Error(error.message);
  }

  await logSubscriptionEvent(supabase, input.storeId, "BILLING_STATUS_CHANGED", {
    plan_type: input.planType,
    plan_status: input.planStatus,
    billing_cycle: input.billingCycle,
  });
}

export async function recordBillingWebhookEvent(
  supabase: any,
  input: {
    provider: BillingProviderName | string;
    eventType: string;
    payload: Record<string, unknown>;
    storeId?: string | null;
    status?: string;
  },
) {
  const { error } = await supabase.from("billing_provider_events").insert({
    provider: input.provider,
    event_type: input.eventType,
    payload: input.payload,
    store_id: input.storeId ?? null,
    status: input.status ?? "received",
  });

  if (error) {
    throw new Error(error.message);
  }
}
