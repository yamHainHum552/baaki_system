import { redirect } from "next/navigation";
import {
  getStoreUsageSnapshot,
  resolveStoreEntitlements,
  type StoreEntitlements,
  type StoreSubscription,
  type StoreUsage,
} from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export type StoreMembership = {
  store_id: string;
  store_name: string;
  role: "OWNER" | "STAFF";
};

export type StoreContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  store: {
    id: string;
    name: string;
    phone: string | null;
    risk_threshold: number;
    admin_status: "active" | "suspended";
    suspension_reason: string | null;
    subscription_plan: "FREE" | "PREMIUM";
    customer_limit: number;
    upgrade_request_status: string | null;
    role: "OWNER" | "STAFF";
    memberships: StoreMembership[];
    subscription: StoreSubscription;
    usage: StoreUsage;
    entitlements: StoreEntitlements;
  };
};

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function requireUser() {
  const { supabase, user } = await getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function requireStoreContext(): Promise<StoreContext> {
  const { supabase, user } = await requireUser();
  const context = await getStoreContextFromUser(supabase, user.id);

  if (!context) {
    redirect("/setup");
  }

  if (context.admin_status === "suspended") {
    redirect("/suspended");
  }

  return {
    supabase,
    userId: user.id,
    store: context
  };
}

export async function getWorkspaceStateForUser() {
  const { supabase, user } = await requireUser();
  const context = await getStoreContextFromUser(supabase, user.id);

  return {
    supabase,
    user,
    context,
  };
}

export async function getStoreContextForApi() {
  const { supabase, user } = await getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const context = await getStoreContextFromUser(supabase, user.id);

  if (!context) {
    return { error: "Store setup is incomplete.", status: 403 as const };
  }

  if (context.admin_status === "suspended") {
    return { error: "This store is suspended.", status: 423 as const };
  }

  return {
    supabase,
    userId: user.id,
    store: context
  };
}

export async function requireStoreRole(
  role: "OWNER" | "STAFF",
  redirectTo = "/dashboard?error=Access%20denied"
) {
  const context = await requireStoreContext();

  if (!hasRequiredRole(context.store.role, role)) {
    redirect(redirectTo);
  }

  return context;
}

export async function getStoreContextForApiWithRole(role: "OWNER" | "STAFF") {
  const context = await getStoreContextForApi();

  if ("error" in context) {
    return context;
  }

  if (!hasRequiredRole(context.store.role, role)) {
    return { error: "Access denied.", status: 403 as const };
  }

  return context;
}

async function getStoreContextFromUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("store_id, active_store_id")
    .eq("id", userId)
    .maybeSingle();

  const [{ data: memberships, error: membershipsError }] = await Promise.all([
    supabase
      .from("store_memberships")
      .select("role, store_id, stores(name)")
      .eq("user_id", userId),
  ]);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const availableStores: StoreMembership[] = (memberships ?? [])
    .filter((membership: any) => membership.stores && !Array.isArray(membership.stores))
    .map((membership: any) => ({
      store_id: membership.store_id,
      store_name: membership.stores.name,
      role: membership.role
    }));

  const fallbackStoreId = availableStores[0]?.store_id ?? null;
  const activeStoreId = profile?.active_store_id ?? profile?.store_id ?? fallbackStoreId;

  if (!activeStoreId) {
    return null;
  }

  const [{ data: subscription }, { data: upgradeRequest }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("store_id, plan, customer_limit, plan_type, plan_status, premium_enabled, trial_started_at, trial_ends_at, subscription_starts_at, subscription_ends_at, grace_ends_at, billing_cycle, max_customers, max_staff, max_sms_per_month, max_exports_per_month, max_share_links_per_month, feature_flags, billing_provider, provider_subscription_id")
      .eq("store_id", activeStoreId)
      .maybeSingle(),
    supabase
      .from("subscription_upgrade_requests")
      .select("status")
      .eq("store_id", activeStoreId)
      .maybeSingle()
  ]);

  const currentMembership = availableStores.find((membership) => membership.store_id === activeStoreId);

  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("id, name, phone, risk_threshold, admin_status, suspension_reason")
    .eq("id", activeStoreId)
    .single();

  if (storeError || !storeData || !currentMembership) {
    return null;
  }

  const usage = await getStoreUsageSnapshot(supabase, activeStoreId);
  const normalizedSubscription: StoreSubscription = {
    store_id: activeStoreId,
    legacy_plan: subscription?.plan ?? "FREE",
    legacy_customer_limit: Number(subscription?.customer_limit ?? 50),
    plan_type: subscription?.plan_type ?? "free",
    plan_status: subscription?.plan_status ?? "active",
    premium_enabled: Boolean(subscription?.premium_enabled),
    trial_started_at: subscription?.trial_started_at ?? null,
    trial_ends_at: subscription?.trial_ends_at ?? null,
    subscription_starts_at: subscription?.subscription_starts_at ?? null,
    subscription_ends_at: subscription?.subscription_ends_at ?? null,
    grace_ends_at: subscription?.grace_ends_at ?? null,
    billing_cycle: subscription?.billing_cycle ?? "none",
    max_customers: Number(subscription?.max_customers ?? subscription?.customer_limit ?? 50),
    max_staff: Number(subscription?.max_staff ?? 1),
    max_sms_per_month: Number(subscription?.max_sms_per_month ?? 0),
    max_exports_per_month: Number(subscription?.max_exports_per_month ?? 3),
    max_share_links_per_month: Number(subscription?.max_share_links_per_month ?? 5),
    feature_flags: (subscription?.feature_flags ?? {}) as Record<string, boolean>,
    billing_provider: subscription?.billing_provider ?? null,
    provider_subscription_id: subscription?.provider_subscription_id ?? null,
  };
  const entitlements = resolveStoreEntitlements(normalizedSubscription, usage);

  return {
    id: storeData.id,
    name: storeData.name,
    phone: storeData.phone,
    risk_threshold: Number(storeData.risk_threshold ?? 1000),
    admin_status: (storeData.admin_status ?? "active") as "active" | "suspended",
    suspension_reason: storeData.suspension_reason ?? null,
    subscription_plan: normalizedSubscription.legacy_plan,
    customer_limit: normalizedSubscription.legacy_customer_limit,
    upgrade_request_status: upgradeRequest?.status ?? null,
    role: currentMembership.role,
    memberships: availableStores,
    subscription: normalizedSubscription,
    usage,
    entitlements,
  };
}

function hasRequiredRole(currentRole: "OWNER" | "STAFF", requiredRole: "OWNER" | "STAFF") {
  if (currentRole === "OWNER") {
    return true;
  }

  return currentRole === requiredRole;
}
