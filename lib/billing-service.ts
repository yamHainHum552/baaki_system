import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBillablePlanConfig,
  getBillingProviderAvailability,
  listBillingPlans,
  type BillablePlanType,
  type SupportedBillingProvider,
} from "@/lib/billing-config";
import { BillingError } from "@/lib/billing-errors";
import {
  getBillingProviderAdapter,
  type BillingCheckoutResult,
  type BillingPaymentRecord,
  type NormalizedBillingVerification,
} from "@/lib/billing-providers";
import { getStoreSubscription, PLAN_DEFINITIONS } from "@/lib/entitlements";

export type BillingPaymentStatus =
  | "pending"
  | "initiated"
  | "verified"
  | "failed"
  | "cancelled";

export async function createBillingCheckoutSession(input: {
  storeId: string;
  storeName: string;
  userId: string;
  provider: SupportedBillingProvider;
  planType: BillablePlanType;
  customerEmail?: string | null;
  customerPhone?: string | null;
}) {
  const availability = getBillingProviderAvailability();
  if (!availability[input.provider]) {
    throw new BillingError(
      "BILLING_NOT_CONFIGURED",
      `${labelForProvider(input.provider)} is not configured yet.`,
      500,
      { provider: input.provider },
    );
  }

  const plan = getBillablePlanConfig(input.planType);
  if (!plan.isLive) {
    throw new BillingError(
      "UNSUPPORTED_PLAN",
      `${plan.label} billing is not live yet.`,
      400,
      { planType: input.planType },
    );
  }

  const adminClient = createAdminClient();
  const payment = await createPendingPayment(adminClient, {
    storeId: input.storeId,
    userId: input.userId,
    provider: input.provider,
    planType: input.planType,
    amountMinor: plan.amountMinor,
    currency: plan.currency,
  });

  const adapter = getBillingProviderAdapter(input.provider);
  let checkout: BillingCheckoutResult;

  try {
    checkout = await adapter.createCheckout({
      payment,
      storeName: input.storeName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
    });
  } catch (error) {
    await adminClient
      .from("billing_payments")
      .update({
        status: "failed",
        provider_status: "INIT_FAILED",
        last_provider_event_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    await recordBillingProviderEvent(adminClient, {
      provider: input.provider,
      storeId: input.storeId,
      billingPaymentId: payment.id,
      providerReference: payment.purchase_order_id,
      eventType: "PAYMENT_INIT_FAILED",
      eventStatus: "failed",
      payload: {
        message: error instanceof Error ? error.message : "Unable to initialize billing checkout.",
      },
      processingResult: "Checkout initialization failed",
    });

    throw error;
  }

  const { error: initUpdateError } = await adminClient
    .from("billing_payments")
    .update({
      status: "initiated",
      provider_reference_id: checkout.providerReferenceId ?? null,
      raw_init_payload: checkout.raw,
      last_provider_event_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (initUpdateError) {
    throw new BillingError("PAYMENT_INIT_FAILED", initUpdateError.message, 500);
  }

  await recordBillingProviderEvent(adminClient, {
    provider: input.provider,
    storeId: input.storeId,
    billingPaymentId: payment.id,
    providerReference: checkout.providerReferenceId ?? payment.purchase_order_id,
    eventType: "PAYMENT_INITIATED",
    eventStatus: "initiated",
    payload: checkout.raw,
    processingResult: "Checkout initialized",
  });

  await logStoreSubscriptionEvent(adminClient, input.storeId, "BILLING_INITIATED", {
    provider: input.provider,
    plan_type: input.planType,
    amount_minor: plan.amountMinor,
    billing_cycle: plan.billingCycle,
  });

  return {
    paymentId: payment.id,
    checkout,
  };
}

export async function verifyBillingCallback(input: {
  provider: SupportedBillingProvider;
  callbackData: Record<string, unknown>;
}) {
  const adminClient = createAdminClient();
  const payment = await findPaymentForCallback(adminClient, input.provider, input.callbackData);

  if (!payment) {
    throw new BillingError(
      "PAYMENT_NOT_FOUND",
      "Payment session could not be found for this callback.",
      404,
      { provider: input.provider },
    );
  }

  if (payment.status === "verified") {
    await recordBillingProviderEvent(adminClient, {
      provider: input.provider,
      storeId: payment.store_id,
      billingPaymentId: payment.id,
      providerReference: payment.provider_reference_id ?? payment.purchase_order_id,
      eventType: "DUPLICATE_CALLBACK_IGNORED",
      eventStatus: "ignored",
      payload: input.callbackData,
      processingResult: "Duplicate verified callback ignored",
    });

    return {
      ok: true,
      alreadyProcessed: true,
      storeId: payment.store_id,
      payment,
    };
  }

  const adapter = getBillingProviderAdapter(input.provider);
  const verification = await adapter.verifyPayment({
    payment,
    callbackData: input.callbackData,
  });

  const { error: verificationUpdateError } = await adminClient
    .from("billing_payments")
    .update({
      provider_payment_id: verification.externalPaymentId,
      provider_reference_id: verification.externalReference ?? payment.provider_reference_id,
      provider_status: verification.providerStatus,
      status: verification.verified ? payment.status : verification.paymentStatus,
      raw_callback_payload: input.callbackData,
      raw_verification_payload: verification.rawResponse,
      verified_at: verification.verified ? null : null,
      completed_at: verification.verified ? null : null,
      last_provider_event_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (verificationUpdateError) {
    throw new BillingError("PAYMENT_VERIFICATION_FAILED", verificationUpdateError.message, 500);
  }

  await recordBillingProviderEvent(adminClient, {
    provider: input.provider,
    storeId: payment.store_id,
    billingPaymentId: payment.id,
    providerReference: verification.externalReference ?? payment.purchase_order_id,
    eventType: "PAYMENT_VERIFICATION_RESULT",
    eventStatus: verification.paymentStatus,
    payload: verification.rawResponse,
    processingResult: verification.verified ? "Verified by provider" : "Provider did not verify payment",
  });

  if (!verification.verified) {
    await logStoreSubscriptionEvent(adminClient, payment.store_id, "PAYMENT_VERIFICATION_FAILED", {
      provider: input.provider,
      provider_status: verification.providerStatus,
      payment_id: payment.id,
    });

    return {
      ok: false,
      alreadyProcessed: false,
      storeId: payment.store_id,
      payment,
      verification,
    };
  }

  const activation = await applyVerifiedPayment(adminClient, payment, verification);

  return {
    ok: true,
    alreadyProcessed: false,
    storeId: payment.store_id,
    payment,
    verification,
    activation,
  };
}

export async function markBillingFailure(input: {
  provider: SupportedBillingProvider;
  transactionReference: string;
  payload?: Record<string, unknown>;
}) {
  const adminClient = createAdminClient();
  const payment = await findPaymentByPurchaseOrderId(
    adminClient,
    input.provider,
    input.transactionReference,
  );

  if (!payment) {
    return null;
  }

  if (payment.status === "verified") {
    return payment;
  }

  await adminClient
    .from("billing_payments")
    .update({
      status: "failed",
      provider_status: "FAILED",
      raw_callback_payload: input.payload ?? {},
      last_provider_event_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  await recordBillingProviderEvent(adminClient, {
    provider: input.provider,
    storeId: payment.store_id,
    billingPaymentId: payment.id,
    providerReference: input.transactionReference,
    eventType: "PAYMENT_FAILED_CALLBACK",
    eventStatus: "failed",
    payload: input.payload ?? {},
    processingResult: "Failure callback received",
  });

  await logStoreSubscriptionEvent(adminClient, payment.store_id, "PAYMENT_VERIFICATION_FAILED", {
    provider: input.provider,
    payment_id: payment.id,
    reason: "failure_callback",
  });

  return payment;
}

export async function listStoreBillingHistory(supabase: any, storeId: string) {
  const { data, error } = await supabase
    .from("billing_payments")
    .select("id, provider, plan_type, billing_cycle, amount, currency, status, provider_reference_id, provider_payment_id, initiated_at, verified_at, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function getBillingCatalog() {
  const providerAvailability = getBillingProviderAvailability();

  return {
    plans: listBillingPlans(),
    providerAvailability,
  };
}

async function createPendingPayment(
  adminClient: ReturnType<typeof createAdminClient>,
  input: {
    storeId: string;
    userId: string;
    provider: SupportedBillingProvider;
    planType: BillablePlanType;
    amountMinor: number;
    currency: string;
  },
) {
  const purchaseOrderId = randomUUID();
  const plan = getBillablePlanConfig(input.planType);
  const amount = input.amountMinor / 100;

  const { data, error } = await adminClient
    .from("billing_payments")
    .insert({
      store_id: input.storeId,
      provider: input.provider,
      plan_type: input.planType,
      billing_cycle: plan.billingCycle,
      amount_minor: input.amountMinor,
      amount,
      currency: input.currency,
      status: "pending",
      purchase_order_id: purchaseOrderId,
      initiated_by_user_id: input.userId,
      initiated_at: new Date().toISOString(),
      raw_metadata: {
        plan_label: plan.label,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new BillingError(
      "PAYMENT_INIT_FAILED",
      error?.message ?? "Unable to create a payment session.",
      500,
    );
  }

  return data as BillingPaymentRecord & { status: BillingPaymentStatus; amount: number };
}

async function applyVerifiedPayment(
  adminClient: ReturnType<typeof createAdminClient>,
  payment: BillingPaymentRecord & { initiated_by_user_id?: string | null },
  verification: NormalizedBillingVerification,
) {
  const subscription = await getStoreSubscription(adminClient, payment.store_id);
  const currentSubscriptionRow = await adminClient
    .from("subscriptions")
    .select("id, subscription_starts_at, subscription_ends_at, plan_status, plan_type")
    .eq("store_id", payment.store_id)
    .maybeSingle();

  if (currentSubscriptionRow.error) {
    throw new BillingError(
      "PAYMENT_VERIFICATION_FAILED",
      currentSubscriptionRow.error.message,
      500,
    );
  }

  const plan = getBillablePlanConfig(payment.plan_type);
  const now = new Date();
  const currentEndsAt = subscription.subscription_ends_at
    ? new Date(subscription.subscription_ends_at)
    : null;
  const isCurrentlyActivePremium =
    (subscription.plan_type === "premium_monthly" || subscription.plan_type === "premium_yearly") &&
    subscription.plan_status === "active" &&
    subscription.premium_enabled &&
    currentEndsAt != null &&
    currentEndsAt > now;

  const startsAt = isCurrentlyActivePremium && currentEndsAt ? currentEndsAt : now;
  const endsAt = addMonths(startsAt, plan.durationMonths);
  const lifecycleAction =
    subscription.plan_status === "trialing"
      ? "TRIAL_CONVERTED_TO_PAID"
      : isCurrentlyActivePremium
        ? "SUBSCRIPTION_EXTENDED"
        : "SUBSCRIPTION_ACTIVATED";

  const definition = PLAN_DEFINITIONS[payment.plan_type];

  const { error } = await adminClient
    .from("subscriptions")
    .update({
      plan: "PREMIUM",
      customer_limit: definition.limits.customers,
      plan_type: payment.plan_type,
      plan_status: "active",
      premium_enabled: true,
      trial_ends_at: subscription.plan_status === "trialing" ? now.toISOString() : subscription.trial_ends_at,
      billing_cycle: plan.billingCycle,
      subscription_starts_at:
        isCurrentlyActivePremium && currentSubscriptionRow.data?.subscription_starts_at
          ? currentSubscriptionRow.data.subscription_starts_at
          : now.toISOString(),
      subscription_ends_at: endsAt.toISOString(),
      grace_ends_at: null,
      max_customers: definition.limits.customers,
      max_staff: definition.limits.staff,
      max_sms_per_month: definition.limits.smsPerMonth,
      max_exports_per_month: definition.limits.exportsPerMonth,
      max_share_links_per_month: definition.limits.shareLinksPerMonth,
      billing_provider: payment.provider,
      provider_subscription_id: verification.externalReference,
      provider_payment_id: verification.externalPaymentId,
      provider_reference_id: verification.externalReference,
      plan_code: payment.plan_type,
      amount: payment.amount_minor / 100,
      currency: payment.currency,
      payment_initiated_at: payment.initiated_at,
      payment_verified_at: verification.paidAt ?? new Date().toISOString(),
      raw_metadata: verification.rawResponse,
      created_by_user_id: payment.initiated_by_user_id ?? null,
      verified_by_system: true,
      last_provider_event_at: new Date().toISOString(),
    })
    .eq("store_id", payment.store_id);

  if (error) {
    throw new BillingError("PAYMENT_VERIFICATION_FAILED", error.message, 500);
  }

  await adminClient
    .from("billing_payments")
    .update({
      subscription_id: currentSubscriptionRow.data?.id ?? null,
      status: "verified",
      provider_payment_id: verification.externalPaymentId,
      provider_reference_id: verification.externalReference,
      provider_status: verification.providerStatus,
      verified_at: verification.paidAt ?? new Date().toISOString(),
      completed_at: new Date().toISOString(),
      raw_verification_payload: verification.rawResponse,
    })
    .eq("id", payment.id);

  await recordBillingProviderEvent(adminClient, {
    provider: payment.provider,
    storeId: payment.store_id,
    billingPaymentId: payment.id,
    subscriptionId: currentSubscriptionRow.data?.id ?? null,
    providerReference: verification.externalReference ?? payment.purchase_order_id,
    eventType: lifecycleAction,
    eventStatus: "active",
    payload: verification.rawResponse,
    processingResult: lifecycleAction.replaceAll("_", " ").toLowerCase(),
  });

  await logStoreSubscriptionEvent(adminClient, payment.store_id, "PAYMENT_VERIFIED", {
    provider: payment.provider,
    payment_id: payment.id,
    provider_reference: verification.externalReference,
    provider_payment_id: verification.externalPaymentId,
  });

  await logStoreSubscriptionEvent(adminClient, payment.store_id, lifecycleAction, {
    provider: payment.provider,
    payment_id: payment.id,
    plan_type: payment.plan_type,
    subscription_ends_at: endsAt.toISOString(),
  });

  return {
    lifecycleAction,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

async function findPaymentForCallback(
  adminClient: ReturnType<typeof createAdminClient>,
  provider: SupportedBillingProvider,
  callbackData: Record<string, unknown>,
) {
  if (provider === "khalti") {
    const purchaseOrderId =
      typeof callbackData.purchase_order_id === "string"
        ? callbackData.purchase_order_id
        : null;
    const pidx = typeof callbackData.pidx === "string" ? callbackData.pidx : null;

    if (purchaseOrderId) {
      return findPaymentByPurchaseOrderId(adminClient, provider, purchaseOrderId);
    }

    if (pidx) {
      const { data, error } = await adminClient
        .from("billing_payments")
        .select("*")
        .eq("provider", provider)
        .eq("provider_reference_id", pidx)
        .maybeSingle();

      if (error) {
        throw new BillingError("PAYMENT_VERIFICATION_FAILED", error.message, 500);
      }

      return data as (BillingPaymentRecord & { status: BillingPaymentStatus; initiated_by_user_id?: string | null }) | null;
    }
  }

  const transactionUuid =
    typeof callbackData.transaction_uuid === "string"
      ? callbackData.transaction_uuid
      : typeof callbackData.purchase_order_id === "string"
        ? callbackData.purchase_order_id
        : null;

  if (!transactionUuid) {
    throw new BillingError(
      "INVALID_PROVIDER_CALLBACK",
      "Provider callback is missing its transaction reference.",
      400,
      { provider },
    );
  }

  return findPaymentByPurchaseOrderId(adminClient, provider, transactionUuid);
}

async function findPaymentByPurchaseOrderId(
  adminClient: ReturnType<typeof createAdminClient>,
  provider: SupportedBillingProvider,
  purchaseOrderId: string,
) {
  const { data, error } = await adminClient
    .from("billing_payments")
    .select("*")
    .eq("provider", provider)
    .eq("purchase_order_id", purchaseOrderId)
    .maybeSingle();

  if (error) {
    throw new BillingError("PAYMENT_VERIFICATION_FAILED", error.message, 500);
  }

  return data as (BillingPaymentRecord & { status: BillingPaymentStatus; initiated_by_user_id?: string | null }) | null;
}

async function recordBillingProviderEvent(
  adminClient: ReturnType<typeof createAdminClient>,
  input: {
    provider: string;
    eventType: string;
    eventStatus: string;
    payload: Record<string, unknown>;
    storeId?: string | null;
    subscriptionId?: string | null;
    billingPaymentId?: string | null;
    providerReference?: string | null;
    processingResult?: string | null;
  },
) {
  const { error } = await adminClient.from("billing_provider_events").insert({
    store_id: input.storeId ?? null,
    subscription_id: input.subscriptionId ?? null,
    billing_payment_id: input.billingPaymentId ?? null,
    provider: input.provider,
    event_type: input.eventType,
    status: input.eventStatus,
    provider_reference: input.providerReference ?? null,
    payload: input.payload,
    processed_at: new Date().toISOString(),
    processing_result: input.processingResult ?? null,
  });

  if (error) {
    throw new BillingError("PAYMENT_VERIFICATION_FAILED", error.message, 500);
  }
}

async function logStoreSubscriptionEvent(
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
    throw new BillingError("PAYMENT_VERIFICATION_FAILED", error.message, 500);
  }
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function labelForProvider(provider: SupportedBillingProvider) {
  return provider === "khalti" ? "Khalti" : "eSewa";
}
