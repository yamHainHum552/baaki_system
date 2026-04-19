"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearCache } from "@/lib/cache";
import { PLAN_DEFINITIONS } from "@/lib/entitlements";
import { logAdminAction, requireAdminAccess, type GlobalAdminRole } from "@/lib/admin";

const BILLING_ROLES: GlobalAdminRole[] = ["SUPER_ADMIN", "BILLING_ADMIN"];
const OPS_ROLES: GlobalAdminRole[] = ["SUPER_ADMIN", "OPS_ADMIN"];
const ALL_ADMIN_ROLES: GlobalAdminRole[] = ["SUPER_ADMIN", "SUPPORT_ADMIN", "BILLING_ADMIN", "OPS_ADMIN"];

export async function updateStoreAdminStatusAction(formData: FormData) {
  const context = await requireAdminAccess(OPS_ROLES);
  const storeId = String(formData.get("store_id") ?? "");
  const status = String(formData.get("status") ?? "active") as "active" | "suspended";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!storeId) {
    redirect("/super-admin/stores?error=Store%20ID%20is%20required");
  }

  const { error } = await context.adminClient
    .from("stores")
    .update({
      admin_status: status,
      suspended_at: status === "suspended" ? new Date().toISOString() : null,
      suspension_reason: status === "suspended" ? reason : null,
    })
    .eq("id", storeId);

  if (error) {
    redirect(`/super-admin/stores/${storeId}?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(context.adminClient, {
    actorUserId: context.userId,
    actorRole: context.adminRole,
    action: status === "suspended" ? "STORE_SUSPENDED" : "STORE_REACTIVATED",
    targetType: "store",
    targetId: storeId,
    storeId,
    details: { reason },
  });

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/stores");
  revalidatePath(`/super-admin/stores/${storeId}`);
  redirect(`/super-admin/stores/${storeId}?message=${encodeURIComponent(status === "suspended" ? "Store suspended" : "Store reactivated")}`);
}

export async function updateStoreSubscriptionAction(formData: FormData) {
  const context = await requireAdminAccess(BILLING_ROLES);
  const storeId = String(formData.get("store_id") ?? "");

  if (!storeId) {
    redirect("/super-admin/premium-requests?error=Store%20ID%20is%20required");
  }

  const payload = {
    plan_type: String(formData.get("plan_type") ?? "free"),
    plan_status: String(formData.get("plan_status") ?? "active"),
    premium_enabled: String(formData.get("premium_enabled") ?? "false") === "true",
    billing_cycle: String(formData.get("billing_cycle") ?? "none"),
    subscription_starts_at: String(formData.get("subscription_starts_at") ?? "").trim() || null,
    subscription_ends_at: String(formData.get("subscription_ends_at") ?? "").trim() || null,
    grace_ends_at: String(formData.get("grace_ends_at") ?? "").trim() || null,
    max_customers: Number(formData.get("max_customers") ?? 50),
    max_staff: Number(formData.get("max_staff") ?? 1),
    max_sms_per_month: Number(formData.get("max_sms_per_month") ?? 0),
    max_exports_per_month: Number(formData.get("max_exports_per_month") ?? 3),
    max_share_links_per_month: Number(formData.get("max_share_links_per_month") ?? 5),
    billing_provider: String(formData.get("billing_provider") ?? "").trim() || null,
    provider_subscription_id: String(formData.get("provider_subscription_id") ?? "").trim() || null,
  };

  const { error } = await context.adminClient
    .from("subscriptions")
    .update({
      ...payload,
      plan: payload.plan_type === "free" ? "FREE" : "PREMIUM",
    })
    .eq("store_id", storeId);

  if (error) {
    redirect(`/super-admin/stores/${storeId}?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(context.adminClient, {
    actorUserId: context.userId,
    actorRole: context.adminRole,
    action: "SUBSCRIPTION_UPDATED",
    targetType: "subscription",
    targetId: storeId,
    storeId,
    details: payload,
  });

  clearStorePremiumCaches(storeId);
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/stores");
  revalidatePath("/super-admin/premium-requests");
  revalidatePath(`/super-admin/stores/${storeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/customers");
  redirect(`/super-admin/stores/${storeId}?message=Subscription%20updated`);
}

export async function updatePremiumRequestStatusAction(formData: FormData) {
  const context = await requireAdminAccess(ALL_ADMIN_ROLES);
  const requestId = String(formData.get("request_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const status = String(formData.get("status") ?? "CONTACTED");
  const adminNote = String(formData.get("admin_note") ?? "").trim();
  const activatePlan = String(formData.get("activate_plan") ?? "").trim();

  if (!requestId || !storeId) {
    redirect("/super-admin/premium-requests?error=Request%20data%20is%20missing");
  }

  const nextStatus = activatePlan ? "ACTIVATED" : status;

  const { error } = await context.adminClient
    .from("subscription_upgrade_requests")
    .update({
      status: nextStatus,
      notes: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    redirect(`/super-admin/premium-requests?error=${encodeURIComponent(error.message)}`);
  }

  if (activatePlan) {
    if (!BILLING_ROLES.includes(context.adminRole)) {
      redirect("/super-admin/premium-requests?error=Only%20billing%20admins%20can%20activate%20plans");
    }

    const planType = activatePlan as "premium_monthly" | "premium_yearly";
    const billingCycle = planType === "premium_yearly" ? "yearly" : "monthly";
    const planDefaults = PLAN_DEFINITIONS[planType];
    const endsAt = new Date();
    endsAt.setUTCMonth(endsAt.getUTCMonth() + (planType === "premium_yearly" ? 12 : 1));

    const { error: subscriptionError } = await context.adminClient
      .from("subscriptions")
      .update({
        plan: "PREMIUM",
        customer_limit: planDefaults.limits.customers,
        plan_type: planType,
        plan_status: "active",
        premium_enabled: true,
        billing_cycle: billingCycle,
        max_customers: planDefaults.limits.customers,
        max_staff: planDefaults.limits.staff,
        max_sms_per_month: planDefaults.limits.smsPerMonth,
        max_exports_per_month: planDefaults.limits.exportsPerMonth,
        max_share_links_per_month: planDefaults.limits.shareLinksPerMonth,
        subscription_starts_at: new Date().toISOString(),
        subscription_ends_at: endsAt.toISOString(),
      })
      .eq("store_id", storeId);

    if (subscriptionError) {
      redirect(`/super-admin/premium-requests?error=${encodeURIComponent(subscriptionError.message)}`);
    }
  }

  await logAdminAction(context.adminClient, {
    actorUserId: context.userId,
    actorRole: context.adminRole,
    action: activatePlan ? "PREMIUM_REQUEST_ACTIVATED" : "PREMIUM_REQUEST_UPDATED",
    targetType: "premium_request",
    targetId: requestId,
    storeId,
    details: { status: nextStatus, adminNote, activatePlan: activatePlan || null },
  });

  clearStorePremiumCaches(storeId);
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/premium-requests");
  revalidatePath(`/super-admin/stores/${storeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/customers");
  redirect("/super-admin/premium-requests?message=Premium%20request%20updated");
}

export async function resetStoreUsageAction(formData: FormData) {
  const context = await requireAdminAccess(OPS_ROLES);
  const storeId = String(formData.get("store_id") ?? "");

  if (!storeId) {
    redirect("/super-admin/usage?error=Store%20ID%20is%20required");
  }

  const usageMonth = currentUsageMonth();
  const { error } = await context.adminClient
    .from("store_usage_counters")
    .upsert({
      store_id: storeId,
      usage_month: usageMonth,
      sms_sent_count: 0,
      export_count: 0,
      share_link_count: 0,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    redirect(`/super-admin/stores/${storeId}?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(context.adminClient, {
    actorUserId: context.userId,
    actorRole: context.adminRole,
    action: "STORE_USAGE_RESET",
    targetType: "usage_counter",
    targetId: storeId,
    storeId,
    details: { usage_month: usageMonth },
  });

  clearStorePremiumCaches(storeId);
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/usage");
  revalidatePath(`/super-admin/stores/${storeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect(`/super-admin/stores/${storeId}?message=Usage%20counters%20reset`);
}

export async function updateStoreFeatureFlagsAction(formData: FormData) {
  const context = await requireAdminAccess(["SUPER_ADMIN", "BILLING_ADMIN", "OPS_ADMIN"]);
  const storeId = String(formData.get("store_id") ?? "");
  const rawFlags = String(formData.get("feature_flags") ?? "{}").trim();

  if (!storeId) {
    redirect("/super-admin/stores?error=Store%20ID%20is%20required");
  }

  let parsedFlags: Record<string, boolean> = {};
  try {
    parsedFlags = JSON.parse(rawFlags || "{}");
  } catch {
    redirect(`/super-admin/stores/${storeId}?error=Feature%20flags%20must%20be%20valid%20JSON`);
  }

  const { error } = await context.adminClient
    .from("subscriptions")
    .update({ feature_flags: parsedFlags })
    .eq("store_id", storeId);

  if (error) {
    redirect(`/super-admin/stores/${storeId}?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(context.adminClient, {
    actorUserId: context.userId,
    actorRole: context.adminRole,
    action: "FEATURE_FLAGS_UPDATED",
    targetType: "subscription",
    targetId: storeId,
    storeId,
    details: parsedFlags,
  });

  clearStorePremiumCaches(storeId);
  revalidatePath(`/super-admin/stores/${storeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/customers");
  redirect(`/super-admin/stores/${storeId}?message=Feature%20flags%20updated`);
}

export async function addAdminSupportNoteAction(formData: FormData) {
  const context = await requireAdminAccess(ALL_ADMIN_ROLES);
  const storeId = String(formData.get("store_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const category = String(formData.get("category") ?? "GENERAL").trim() || "GENERAL";

  if (!storeId || !note) {
    redirect(`/super-admin/stores/${storeId}?error=Support%20note%20cannot%20be%20empty`);
  }

  const { error } = await context.adminClient.from("admin_support_notes").insert({
    store_id: storeId,
    author_user_id: context.userId,
    note,
    category,
  });

  if (error) {
    redirect(`/super-admin/stores/${storeId}?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(context.adminClient, {
    actorUserId: context.userId,
    actorRole: context.adminRole,
    action: "SUPPORT_NOTE_ADDED",
    targetType: "support_note",
    storeId,
    details: { category },
  });

  revalidatePath(`/super-admin/stores/${storeId}`);
  redirect(`/super-admin/stores/${storeId}?message=Support%20note%20saved`);
}

function currentUsageMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function clearStorePremiumCaches(storeId: string) {
  clearCache(`dashboard:${storeId}`);
  clearCache(`customers:${storeId}`);
}
