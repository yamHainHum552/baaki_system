import { redirect } from "next/navigation";
import { withCache } from "@/lib/cache";
import {
  getStoreUsageSnapshot,
  resolveStoreEntitlements,
  type StoreEntitlements,
  type StoreSubscription,
  type StoreUsage,
} from "@/lib/entitlements";
import {
  hasStorePermission,
  normalizeStorePermissions,
  type StorePermission,
} from "@/lib/store-permissions";
import { createClient } from "@/lib/supabase/server";

export type StoreMembership = {
  store_id: string;
  store_name: string;
  role: "OWNER" | "STAFF";
  permissions: StorePermission[];
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
    permissions: StorePermission[];
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

export async function getWorkspaceStateIfSignedIn() {
  const { supabase, user } = await getUser();

  if (!user) {
    return null;
  }

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

export async function requireStorePermission(
  permission: StorePermission,
  redirectTo = "/dashboard?error=Access%20denied",
) {
  const context = await requireStoreContext();

  if (!hasStorePermission(context.store.role, context.store.permissions, permission)) {
    redirect(redirectTo);
  }

  return context;
}

export async function getStoreContextForApiWithPermission(permission: StorePermission) {
  const context = await getStoreContextForApi();

  if ("error" in context) {
    return context;
  }

  if (!hasStorePermission(context.store.role, context.store.permissions, permission)) {
    return { error: "Access denied.", status: 403 as const };
  }

  return context;
}

async function getStoreContextFromUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  return withCache(`workspace:${userId}`, 15_000, async () => {
    const [{ data: profile }, { data: memberships, error: membershipsError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("store_id, active_store_id")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("store_memberships")
        .select("*, stores(name)")
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
        role: membership.role,
        permissions: normalizeStorePermissions(membership.permissions),
      }));

    const fallbackStoreId = availableStores[0]?.store_id ?? null;
    const activeStoreId = profile?.active_store_id ?? profile?.store_id ?? fallbackStoreId;

    if (!activeStoreId) {
      return null;
    }

    const currentMembership = availableStores.find((membership) => membership.store_id === activeStoreId);

    const [
      { data: subscription },
      { data: upgradeRequest },
      { data: storeData, error: storeError },
      usage,
    ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("store_id, plan, customer_limit, plan_type, plan_status, premium_enabled, trial_started_at, trial_ends_at, subscription_starts_at, subscription_ends_at, grace_ends_at, billing_cycle, max_customers, max_staff, max_sms_per_month, max_exports_per_month, max_share_links_per_month, feature_flags, billing_provider, provider_subscription_id, provider_payment_id, provider_reference_id, plan_code, amount, currency, payment_initiated_at, payment_verified_at, raw_metadata, created_by_user_id, verified_by_system, last_provider_event_at")
        .eq("store_id", activeStoreId)
        .maybeSingle(),
      supabase
        .from("subscription_upgrade_requests")
        .select("status")
        .eq("store_id", activeStoreId)
        .maybeSingle(),
      supabase
        .from("stores")
        .select("id, name, phone, risk_threshold, admin_status, suspension_reason")
        .eq("id", activeStoreId)
        .single(),
      getStoreUsageSnapshot(supabase, activeStoreId),
    ]);

    if (storeError || !storeData || !currentMembership) {
      return null;
    }

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
      provider_payment_id: subscription?.provider_payment_id ?? null,
      provider_reference_id: subscription?.provider_reference_id ?? null,
      plan_code: subscription?.plan_code ?? null,
      amount: subscription?.amount == null ? null : Number(subscription.amount),
      currency: subscription?.currency ?? "NPR",
      payment_initiated_at: subscription?.payment_initiated_at ?? null,
      payment_verified_at: subscription?.payment_verified_at ?? null,
      raw_metadata: (subscription?.raw_metadata ?? {}) as Record<string, unknown>,
      created_by_user_id: subscription?.created_by_user_id ?? null,
      verified_by_system: Boolean(subscription?.verified_by_system),
      last_provider_event_at: subscription?.last_provider_event_at ?? null,
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
      permissions: currentMembership.permissions,
      memberships: availableStores,
      subscription: normalizedSubscription,
      usage,
      entitlements,
    };
  });
}

function hasRequiredRole(currentRole: "OWNER" | "STAFF", requiredRole: "OWNER" | "STAFF") {
  if (currentRole === "OWNER") {
    return true;
  }

  return currentRole === requiredRole;
}
