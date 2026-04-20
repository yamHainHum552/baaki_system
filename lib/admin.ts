import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type GlobalAdminRole =
  | "SUPER_ADMIN"
  | "SUPPORT_ADMIN"
  | "BILLING_ADMIN"
  | "OPS_ADMIN";

export type StoreAdminStatus = "active" | "suspended";

const ADMIN_ROLE_RANK: Record<GlobalAdminRole, number> = {
  SUPER_ADMIN: 4,
  BILLING_ADMIN: 3,
  OPS_ADMIN: 2,
  SUPPORT_ADMIN: 1,
};

export type AdminContext = {
  userId: string;
  adminRole: GlobalAdminRole;
  fullName: string | null;
  adminClient: ReturnType<typeof createAdminClient>;
};

export type AdminStoreSummary = {
  id: string;
  name: string;
  phone: string | null;
  admin_status: StoreAdminStatus;
  plan_type: "free" | "premium_monthly" | "premium_yearly";
  plan_status: "inactive" | "active" | "trialing" | "past_due" | "cancelled";
  premium_enabled: boolean;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  customer_count: number;
  ledger_count: number;
  staff_count: number;
  sms_sent_count: number;
  export_count: number;
  share_link_count: number;
  created_at: string;
  last_active_at: string | null;
  request_status: string | null;
};

export type PlatformOverview = {
  totalStores: number;
  activeStores: number;
  suspendedStores: number;
  totalUsers: number;
  totalCustomers: number;
  totalLedgerEntries: number;
  freeStores: number;
  premiumStores: number;
  trialingStores: number;
  pastDueOrCancelledStores: number;
  pendingPremiumRequests: number;
  smsUsageThisMonth: number;
  exportUsage: number;
  shareLinkUsage: number;
  newStoresThisWeek: number;
  premiumConversionRate: number;
  storesNearLimits: Array<{
    store_id: string;
    store_name: string;
    plan_type: AdminStoreSummary["plan_type"];
    customers_ratio: number;
    staff_ratio: number;
  }>;
  recentActivity: Array<{
    id: string;
    source: "admin" | "store";
    action: string;
    created_at: string;
    store_name: string | null;
    actor_label: string | null;
  }>;
};

export async function requireAdminAccess(
  allowedRoles: GlobalAdminRole[] = ["SUPER_ADMIN", "SUPPORT_ADMIN", "BILLING_ADMIN", "OPS_ADMIN"],
  redirectTo = "/dashboard?error=Admin%20access%20required",
): Promise<AdminContext> {
  const { user } = await getUser();

  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  const { data: adminUser } = await adminClient
    .from("admin_users")
    .select("role, full_name, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser?.is_active || !isAdminRoleAllowed(adminUser.role, allowedRoles)) {
    redirect(redirectTo);
  }

  return {
    userId: user.id,
    adminRole: adminUser.role as GlobalAdminRole,
    fullName: adminUser.full_name ?? null,
    adminClient,
  };
}

export async function getAdminContextForApi(
  allowedRoles: GlobalAdminRole[] = ["SUPER_ADMIN", "SUPPORT_ADMIN", "BILLING_ADMIN", "OPS_ADMIN"],
) {
  const { user } = await getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const adminClient = createAdminClient();
  const { data: adminUser } = await adminClient
    .from("admin_users")
    .select("role, full_name, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser?.is_active || !isAdminRoleAllowed(adminUser.role, allowedRoles)) {
    return { error: "Admin access denied.", status: 403 as const };
  }

  return {
    userId: user.id,
    adminRole: adminUser.role as GlobalAdminRole,
    fullName: adminUser.full_name ?? null,
    adminClient,
  };
}

export async function logAdminAction(
  adminClient: ReturnType<typeof createAdminClient>,
  input: {
    actorUserId: string;
    actorRole: GlobalAdminRole;
    action: string;
    targetType: string;
    targetId?: string | null;
    storeId?: string | null;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await adminClient.rpc("log_admin_action", {
    p_actor_user_id: input.actorUserId,
    p_actor_role: input.actorRole,
    p_action: input.action,
    p_target_type: input.targetType,
    p_target_id: input.targetId ?? null,
    p_store_id: input.storeId ?? null,
    p_details: input.details ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getPlatformOverview(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<PlatformOverview> {
  const usageMonth = currentUsageMonth();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalStores,
    activeStores,
    suspendedStores,
    totalUsers,
    totalCustomers,
    totalLedgerEntries,
    subscriptions,
    pendingRequests,
    usageRows,
    recentStoreAudit,
    recentAdminAudit,
    limitStores,
  ] = await Promise.all([
    countRows(adminClient, "stores"),
    countRows(adminClient, "stores", (query) => query.eq("admin_status", "active")),
    countRows(adminClient, "stores", (query) => query.eq("admin_status", "suspended")),
    countRows(adminClient, "profiles"),
    countRows(adminClient, "customers"),
    countRows(adminClient, "ledger_entries"),
    adminClient
      .from("subscriptions")
      .select("store_id, plan_type, plan_status, premium_enabled, max_customers, max_staff"),
    countRows(
      adminClient,
      "subscription_upgrade_requests",
      (query) => query.eq("status", "PENDING"),
    ),
    adminClient
      .from("store_usage_counters")
      .select("store_id, sms_sent_count, export_count, share_link_count, customer_count_snapshot, staff_count_snapshot")
      .eq("usage_month", usageMonth),
    adminClient
      .from("audit_logs")
      .select("id, action, created_at, store_id, stores(name), actor_user_id")
      .order("created_at", { ascending: false })
      .limit(8),
    adminClient
      .from("admin_audit_logs")
      .select("id, action, created_at, store_id, stores(name), actor_user_id")
      .order("created_at", { ascending: false })
      .limit(8),
    adminClient
      .from("stores")
      .select("id, name, subscriptions(plan_type, max_customers, max_staff), store_usage_counters!left(customer_count_snapshot, staff_count_snapshot, usage_month)")
      .eq("store_usage_counters.usage_month", usageMonth)
      .limit(40),
  ]);

  if (subscriptions.error) {
    throw new Error(subscriptions.error.message);
  }
  if (usageRows.error) {
    throw new Error(usageRows.error.message);
  }
  if (recentStoreAudit.error) {
    throw new Error(recentStoreAudit.error.message);
  }
  if (recentAdminAudit.error) {
    throw new Error(recentAdminAudit.error.message);
  }
  if (limitStores.error) {
    throw new Error(limitStores.error.message);
  }

  const subscriptionRows = subscriptions.data ?? [];
  const premiumStores = subscriptionRows.filter((row) =>
    row.plan_type === "premium_monthly" || row.plan_type === "premium_yearly",
  ).length;
  const freeStores = subscriptionRows.filter((row) => row.plan_type === "free").length;
  const trialingStores = subscriptionRows.filter((row) => row.plan_status === "trialing").length;
  const pastDueOrCancelledStores = subscriptionRows.filter((row) =>
    row.plan_status === "past_due" || row.plan_status === "cancelled",
  ).length;

  const usageTotals = (usageRows.data ?? []).reduce(
    (acc, row) => {
      acc.sms += Number(row.sms_sent_count ?? 0);
      acc.exports += Number(row.export_count ?? 0);
      acc.shareLinks += Number(row.share_link_count ?? 0);
      return acc;
    },
    { sms: 0, exports: 0, shareLinks: 0 },
  );

  const newStoresThisWeek = await countRows(
    adminClient,
    "stores",
    (query) => query.gte("created_at", weekStart.toISOString()),
  );

  const storesNearLimits = (limitStores.data ?? [])
    .map((row: any) => {
      const subscription = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
      const usage = Array.isArray(row.store_usage_counters)
        ? row.store_usage_counters[0]
        : row.store_usage_counters;
      const maxCustomers = Number(subscription?.max_customers ?? 50);
      const maxStaff = Number(subscription?.max_staff ?? 1);
      const customersUsed = Number(usage?.customer_count_snapshot ?? 0);
      const staffUsed = Number(usage?.staff_count_snapshot ?? 0);
      return {
        store_id: row.id,
        store_name: row.name,
        plan_type: (subscription?.plan_type ?? "free") as AdminStoreSummary["plan_type"],
        customers_ratio: maxCustomers >= 1000000 ? 0 : customersUsed / Math.max(maxCustomers, 1),
        staff_ratio: maxStaff >= 1000000 ? 0 : staffUsed / Math.max(maxStaff, 1),
      };
    })
    .filter((row) => row.customers_ratio >= 0.8 || row.staff_ratio >= 0.8)
    .sort((left, right) => Math.max(right.customers_ratio, right.staff_ratio) - Math.max(left.customers_ratio, left.staff_ratio))
    .slice(0, 6);

  const recentActivity = [...mapAuditRows(recentAdminAudit.data ?? [], "admin"), ...mapAuditRows(recentStoreAudit.data ?? [], "store")]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 10);

  return {
    totalStores,
    activeStores,
    suspendedStores,
    totalUsers,
    totalCustomers,
    totalLedgerEntries,
    freeStores,
    premiumStores,
    trialingStores,
    pastDueOrCancelledStores,
    pendingPremiumRequests: pendingRequests,
    smsUsageThisMonth: usageTotals.sms,
    exportUsage: usageTotals.exports,
    shareLinkUsage: usageTotals.shareLinks,
    newStoresThisWeek,
    premiumConversionRate: totalStores === 0 ? 0 : premiumStores / totalStores,
    storesNearLimits,
    recentActivity,
  };
}

export async function listAdminStores(
  adminClient: ReturnType<typeof createAdminClient>,
  filters: {
    search?: string;
    plan?: string;
    status?: string;
    activity?: string;
  } = {},
): Promise<AdminStoreSummary[]> {
  let storesQuery = adminClient
    .from("stores")
    .select("id, name, phone, created_at, admin_status, created_by, suspended_at, suspension_reason")
    .order("created_at", { ascending: false });

  if (filters.search) {
    storesQuery = storesQuery.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  if (filters.status === "active" || filters.status === "suspended") {
    storesQuery = storesQuery.eq("admin_status", filters.status);
  }

  const { data: stores, error } = await storesQuery.limit(60);
  if (error) {
    throw new Error(error.message);
  }

  const storeIds = (stores ?? []).map((store) => store.id);
  if (!storeIds.length) {
    return [];
  }

  const usageMonth = currentUsageMonth();
  const [
    subscriptions,
    memberships,
    usageRows,
    requests,
    customerCounts,
    ledgerCounts,
    lastActiveRows,
  ] = await Promise.all([
    adminClient
      .from("subscriptions")
      .select("store_id, plan_type, plan_status, premium_enabled")
      .in("store_id", storeIds),
    adminClient
      .from("store_memberships")
      .select("store_id, role, user_id")
      .in("store_id", storeIds),
    adminClient
      .from("store_usage_counters")
      .select("store_id, sms_sent_count, export_count, share_link_count, staff_count_snapshot")
      .eq("usage_month", usageMonth)
      .in("store_id", storeIds),
    adminClient
      .from("subscription_upgrade_requests")
      .select("store_id, status")
      .in("store_id", storeIds),
    Promise.all(storeIds.map((storeId) => countRows(adminClient, "customers", (query) => query.eq("store_id", storeId)))),
    Promise.all(storeIds.map((storeId) => countRows(adminClient, "ledger_entries", (query) => query.eq("store_id", storeId)))),
    Promise.all(
      storeIds.map(async (storeId) => {
        const { data } = await adminClient
          .from("ledger_entries")
          .select("created_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data?.created_at ?? null;
      }),
    ),
  ]);

  if (subscriptions.error) throw new Error(subscriptions.error.message);
  if (memberships.error) throw new Error(memberships.error.message);
  if (usageRows.error) throw new Error(usageRows.error.message);
  if (requests.error) throw new Error(requests.error.message);

  const subscriptionMap = new Map((subscriptions.data ?? []).map((row) => [row.store_id, row]));
  const requestMap = new Map((requests.data ?? []).map((row) => [row.store_id, row.status]));
  const usageMap = new Map((usageRows.data ?? []).map((row) => [row.store_id, row]));
  const membershipMap = new Map<string, Array<{ user_id: string; role: "OWNER" | "STAFF" }>>();
  for (const row of memberships.data ?? []) {
    const current = membershipMap.get(row.store_id) ?? [];
    current.push({ user_id: row.user_id, role: row.role });
    membershipMap.set(row.store_id, current);
  }

  const ownerIds = Array.from(
    new Set(
      Array.from(membershipMap.values())
        .flat()
        .filter((member) => member.role === "OWNER")
        .map((member) => member.user_id),
    ),
  );

  const authUsers = ownerIds.length
    ? await Promise.all(ownerIds.map(async (userId) => {
        const { data } = await adminClient.auth.admin.getUserById(userId);
        return { userId, email: data.user?.email ?? null, phone: data.user?.phone ?? null };
      }))
    : [];
  const ownerProfileRows = ownerIds.length
    ? await adminClient
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds)
    : { data: [], error: null };
  if (ownerProfileRows.error) {
    throw new Error(ownerProfileRows.error.message);
  }
  const ownerProfileMap = new Map((ownerProfileRows.data ?? []).map((row) => [row.id, row.full_name]));
  const authUserMap = new Map(authUsers.map((row) => [row.userId, row]));

  const rows = (stores ?? []).map((store, index) => {
    const subscription = subscriptionMap.get(store.id);
    const usage = usageMap.get(store.id);
    const owners = (membershipMap.get(store.id) ?? []).filter((member) => member.role === "OWNER");
    const owner = owners[0];
    const authUser = owner ? authUserMap.get(owner.user_id) : null;

    return {
      id: store.id,
      name: store.name,
      phone: store.phone,
      admin_status: store.admin_status,
      plan_type: (subscription?.plan_type ?? "free") as AdminStoreSummary["plan_type"],
      plan_status: (subscription?.plan_status ?? "active") as AdminStoreSummary["plan_status"],
      premium_enabled: Boolean(subscription?.premium_enabled),
      owner_name: owner ? ownerProfileMap.get(owner.user_id) ?? null : null,
      owner_email: authUser?.email ?? null,
      owner_phone: authUser?.phone ?? null,
      customer_count: customerCounts[index] ?? 0,
      ledger_count: ledgerCounts[index] ?? 0,
      staff_count: Number(usage?.staff_count_snapshot ?? (membershipMap.get(store.id) ?? []).length),
      sms_sent_count: Number(usage?.sms_sent_count ?? 0),
      export_count: Number(usage?.export_count ?? 0),
      share_link_count: Number(usage?.share_link_count ?? 0),
      created_at: store.created_at,
      last_active_at: lastActiveRows[index] ?? null,
      request_status: requestMap.get(store.id) ?? null,
    };
  });

  let filteredRows = filters.plan
    ? rows.filter((row) => row.plan_type === filters.plan)
    : rows;

  if (filters.activity === "recent") {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    filteredRows = filteredRows.filter((row) =>
      row.last_active_at ? new Date(row.last_active_at).getTime() >= cutoff : false,
    );
  }

  if (filters.activity === "quiet") {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    filteredRows = filteredRows.filter((row) =>
      row.last_active_at ? new Date(row.last_active_at).getTime() < cutoff : true,
    );
  }

  return filteredRows;
}

export async function getAdminStoreDetail(
  adminClient: ReturnType<typeof createAdminClient>,
  storeId: string,
) {
  const usageMonth = currentUsageMonth();
  const [
    store,
    subscription,
    memberships,
    request,
    usage,
    customersCount,
    ledgerCount,
    billingPayments,
    billingEvents,
    auditLogs,
    adminAuditLogs,
    supportNotes,
  ] = await Promise.all([
    adminClient
      .from("stores")
      .select("id, name, phone, risk_threshold, created_by, created_at, admin_status, suspended_at, suspension_reason")
      .eq("id", storeId)
      .single(),
    adminClient
      .from("subscriptions")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle(),
    adminClient
      .from("store_memberships")
      .select("user_id, role, profiles(id, full_name)")
      .eq("store_id", storeId),
    adminClient
      .from("subscription_upgrade_requests")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle(),
    adminClient
      .from("store_usage_counters")
      .select("*")
      .eq("store_id", storeId)
      .eq("usage_month", usageMonth)
      .maybeSingle(),
    countRows(adminClient, "customers", (query) => query.eq("store_id", storeId)),
    countRows(adminClient, "ledger_entries", (query) => query.eq("store_id", storeId)),
    adminClient
      .from("billing_payments")
      .select("id, provider, plan_type, billing_cycle, amount, currency, status, provider_reference_id, provider_payment_id, purchase_order_id, initiated_at, verified_at, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(12),
    adminClient
      .from("billing_provider_events")
      .select("id, provider, event_type, status, provider_reference, processing_result, received_at, processed_at, payload")
      .eq("store_id", storeId)
      .order("received_at", { ascending: false })
      .limit(12),
    adminClient
      .from("audit_logs")
      .select("id, action, entity_type, created_at, details, actor_user_id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient
      .from("admin_audit_logs")
      .select("id, action, target_type, created_at, details, actor_user_id, actor_role")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient
      .from("admin_support_notes")
      .select("id, note, category, created_at, author_user_id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }),
  ]);

  if (store.error) throw new Error(store.error.message);
  if (subscription.error) throw new Error(subscription.error.message);
  if (memberships.error) throw new Error(memberships.error.message);
  if (request.error) throw new Error(request.error.message);
  if (usage.error) throw new Error(usage.error.message);
  if (billingPayments.error) throw new Error(billingPayments.error.message);
  if (billingEvents.error) throw new Error(billingEvents.error.message);
  if (auditLogs.error) throw new Error(auditLogs.error.message);
  if (adminAuditLogs.error) throw new Error(adminAuditLogs.error.message);
  if (supportNotes.error) throw new Error(supportNotes.error.message);

  const membershipRows = memberships.data ?? [];
  const memberUsers = await Promise.all(
    membershipRows.map(async (member: any) => {
      const { data } = await adminClient.auth.admin.getUserById(member.user_id);
      return {
        user_id: member.user_id,
        role: member.role,
        full_name: member.profiles?.full_name ?? null,
        email: data.user?.email ?? null,
        phone: data.user?.phone ?? null,
      };
    }),
  );

  const { data: lastLedger } = await adminClient
    .from("ledger_entries")
    .select("created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    store: store.data,
    subscription: subscription.data,
    request: request.data,
    usage: usage.data,
    customersCount,
    ledgerCount,
    lastActiveAt: lastLedger?.created_at ?? null,
    members: memberUsers,
    billingPayments: billingPayments.data ?? [],
    billingEvents: billingEvents.data ?? [],
    auditLogs: auditLogs.data ?? [],
    adminAuditLogs: adminAuditLogs.data ?? [],
    supportNotes: supportNotes.data ?? [],
  };
}

export async function listPremiumRequests(adminClient: ReturnType<typeof createAdminClient>) {
  const usageMonth = currentUsageMonth();
  const { data, error } = await adminClient
    .from("subscription_upgrade_requests")
    .select("id, store_id, requested_by, contact_phone, notes, status, created_at, updated_at, stores(name, phone)")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const storeIds = Array.from(new Set((data ?? []).map((row: any) => row.store_id)));
  const [{ data: usage }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    adminClient
      .from("store_usage_counters")
      .select("store_id, customer_count_snapshot, staff_count_snapshot, sms_sent_count, export_count, share_link_count")
      .eq("usage_month", usageMonth)
      .in("store_id", storeIds),
    adminClient
      .from("subscriptions")
      .select("store_id, plan_type, plan_status")
      .in("store_id", storeIds),
  ]);

  if (subscriptionsError) {
    throw new Error(subscriptionsError.message);
  }

  const usageMap = new Map((usage ?? []).map((row) => [row.store_id, row]));
  const subscriptionMap = new Map((subscriptions ?? []).map((row) => [row.store_id, row]));

  return (data ?? []).map((row: any) => ({
    id: row.id,
    store_id: row.store_id,
    store_name: row.stores?.name ?? "Unknown store",
    store_phone: row.stores?.phone ?? null,
    requested_by: row.requested_by,
    contact_phone: row.contact_phone,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    current_plan_type: subscriptionMap.get(row.store_id)?.plan_type ?? "free",
    current_plan_status: subscriptionMap.get(row.store_id)?.plan_status ?? "active",
    usage: usageMap.get(row.store_id) ?? null,
  }));
}

export async function listAdminUsers(adminClient: ReturnType<typeof createAdminClient>) {
  const [{ data: adminUsers }, { data: memberships }, { data: profiles, error }] = await Promise.all([
    adminClient.from("admin_users").select("user_id, role, full_name, is_active, created_at"),
    adminClient.from("store_memberships").select("user_id, store_id, role, stores(name)").order("created_at", { ascending: false }),
    adminClient.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const users = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
  const userMap = new Map((users.data.users ?? []).map((user) => [user.id, user]));
  const adminMap = new Map((adminUsers ?? []).map((row) => [row.user_id, row]));
  const membershipMap = new Map<string, Array<{ store_id: string; store_name: string; role: string }>>();
  for (const row of memberships ?? []) {
    const current = membershipMap.get(row.user_id) ?? [];
    current.push({
      store_id: row.store_id,
      store_name: (row as any).stores?.name ?? "Store",
      role: row.role,
    });
    membershipMap.set(row.user_id, current);
  }

  return (profiles ?? []).map((row) => {
    const adminUser = adminMap.get(row.id);
    return {
      user_id: row.id,
      role: (adminUser?.role ?? null) as GlobalAdminRole | null,
      full_name:
        adminUser?.full_name ??
        row.full_name ??
        (userMap.get(row.id)?.user_metadata?.full_name as string | null | undefined) ??
        null,
      is_active: adminUser?.is_active ?? true,
      created_at: row.created_at,
      email: userMap.get(row.id)?.email ?? null,
      store_memberships: membershipMap.get(row.id) ?? [],
    };
  });
}

export async function listUsageMonitoring(adminClient: ReturnType<typeof createAdminClient>) {
  const usageMonth = currentUsageMonth();
  const [stores, usageRows, subscriptions] = await Promise.all([
    adminClient.from("stores").select("id, name, admin_status").order("created_at", { ascending: false }).limit(60),
    adminClient.from("store_usage_counters").select("*").eq("usage_month", usageMonth),
    adminClient.from("subscriptions").select("store_id, max_customers, max_staff, max_sms_per_month, max_exports_per_month, max_share_links_per_month, plan_type"),
  ]);

  if (stores.error) throw new Error(stores.error.message);
  if (usageRows.error) throw new Error(usageRows.error.message);
  if (subscriptions.error) throw new Error(subscriptions.error.message);

  const usageMap = new Map((usageRows.data ?? []).map((row) => [row.store_id, row]));
  const subscriptionMap = new Map((subscriptions.data ?? []).map((row) => [row.store_id, row]));

  return (stores.data ?? []).map((store) => ({
    store_id: store.id,
    store_name: store.name,
    admin_status: store.admin_status,
    usage: usageMap.get(store.id) ?? null,
    subscription: subscriptionMap.get(store.id) ?? null,
  }));
}

export async function listAdminAuditLogs(adminClient: ReturnType<typeof createAdminClient>) {
  const [adminAudit, storeAudit] = await Promise.all([
    adminClient
      .from("admin_audit_logs")
      .select("id, action, target_type, target_id, store_id, created_at, details, actor_user_id, actor_role")
      .order("created_at", { ascending: false })
      .limit(100),
    adminClient
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, store_id, created_at, details, actor_user_id")
      .in("entity_type", ["subscription", "ledger_entry"])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (adminAudit.error) throw new Error(adminAudit.error.message);
  if (storeAudit.error) throw new Error(storeAudit.error.message);

  return [
    ...(adminAudit.data ?? []).map((row) => ({
      ...row,
      source: "admin" as const,
      kind: row.target_type,
    })),
    ...(storeAudit.data ?? []).map((row) => ({
      ...row,
      source: "store" as const,
      kind: row.entity_type,
    })),
  ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export async function getPlatformAnalytics(adminClient: ReturnType<typeof createAdminClient>) {
  const stores = await adminClient
    .from("stores")
    .select("id, created_at, admin_status")
    .order("created_at", { ascending: true });
  const subscriptions = await adminClient
    .from("subscriptions")
    .select("store_id, plan_type, plan_status, created_at");
  const usage = await adminClient
    .from("store_usage_counters")
    .select("store_id, usage_month, sms_sent_count, export_count, share_link_count");

  if (stores.error) throw new Error(stores.error.message);
  if (subscriptions.error) throw new Error(subscriptions.error.message);
  if (usage.error) throw new Error(usage.error.message);

  return {
    monthlyStoreGrowth: bucketByMonth(stores.data ?? [], "created_at"),
    premiumByMonth: bucketByMonth(
      (subscriptions.data ?? []).filter((row) => row.plan_type !== "free"),
      "created_at",
    ),
    activeStatusBreakdown: {
      active: (stores.data ?? []).filter((row) => row.admin_status === "active").length,
      suspended: (stores.data ?? []).filter((row) => row.admin_status === "suspended").length,
    },
    usageByMonth: bucketUsageByMonth(usage.data ?? []),
  };
}

export async function listBillingEvents(adminClient: ReturnType<typeof createAdminClient>) {
  const { data, error } = await adminClient
    .from("billing_provider_events")
    .select("id, provider, event_type, status, provider_reference, processing_result, payload, received_at, processed_at, store_id, stores(name)")
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data ?? [];
}

function isAdminRoleAllowed(currentRole: string | null | undefined, allowedRoles: GlobalAdminRole[]) {
  if (!currentRole) {
    return false;
  }

  const normalized = currentRole as GlobalAdminRole;
  if (allowedRoles.includes(normalized)) {
    return true;
  }

  return normalized === "SUPER_ADMIN";
}

async function countRows(
  adminClient: ReturnType<typeof createAdminClient>,
  table: string,
  apply?: (query: any) => any,
) {
  let query = adminClient.from(table).select("id", { count: "exact", head: true });
  if (apply) {
    query = apply(query);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

function currentUsageMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function mapAuditRows(rows: any[], source: "admin" | "store") {
  return rows.map((row) => ({
    id: row.id,
    source,
    action: row.action,
    created_at: row.created_at,
    store_name: Array.isArray(row.stores) ? row.stores[0]?.name ?? null : row.stores?.name ?? null,
    actor_label: row.actor_user_id ?? null,
  }));
}

function bucketByMonth(rows: Array<Record<string, any>>, key: string) {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const date = new Date(row[key]);
    const bucket = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

function bucketUsageByMonth(rows: Array<Record<string, any>>) {
  const buckets = new Map<string, { sms: number; exports: number; shareLinks: number }>();
  for (const row of rows) {
    const bucket = String(row.usage_month).slice(0, 7);
    const current = buckets.get(bucket) ?? { sms: 0, exports: 0, shareLinks: 0 };
    current.sms += Number(row.sms_sent_count ?? 0);
    current.exports += Number(row.export_count ?? 0);
    current.shareLinks += Number(row.share_link_count ?? 0);
    buckets.set(bucket, current);
  }
  return Array.from(buckets.entries())
    .map(([month, value]) => ({ month, ...value }))
    .sort((left, right) => left.month.localeCompare(right.month));
}
