import { createHmac, timingSafeEqual } from "node:crypto";
import {
  formatAmountMinor,
  getBillingAppUrl,
  getBillablePlanConfig,
  type BillablePlanType,
  type SupportedBillingProvider,
} from "@/lib/billing-config";
import { BillingError } from "@/lib/billing-errors";

export type BillingCheckoutResult =
  | {
      kind: "redirect";
      url: string;
      providerReferenceId?: string | null;
      raw: Record<string, unknown>;
    }
  | {
      kind: "form";
      actionUrl: string;
      method: "POST";
      fields: Record<string, string>;
      providerReferenceId?: string | null;
      raw: Record<string, unknown>;
    };

export type BillingPaymentRecord = {
  id: string;
  provider: SupportedBillingProvider;
  plan_type: BillablePlanType;
  billing_cycle: "monthly" | "yearly";
  amount_minor: number;
  currency: string;
  purchase_order_id: string;
  provider_reference_id: string | null;
  raw_metadata: Record<string, unknown> | null;
  store_id: string;
  initiated_at: string;
};

export type NormalizedBillingVerification = {
  provider: SupportedBillingProvider;
  purchaseOrderId: string;
  externalPaymentId: string | null;
  externalReference: string | null;
  amountMinor: number;
  currency: string;
  verified: boolean;
  paymentStatus: "verified" | "pending" | "failed" | "cancelled";
  providerStatus: string;
  paidAt: string | null;
  rawResponse: Record<string, unknown>;
};

type ProviderCheckoutInput = {
  payment: BillingPaymentRecord;
  storeName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
};

type ProviderVerificationInput = {
  payment: BillingPaymentRecord;
  callbackData: Record<string, unknown>;
};

type BillingProviderAdapter = {
  provider: SupportedBillingProvider;
  createCheckout(input: ProviderCheckoutInput): Promise<BillingCheckoutResult>;
  verifyPayment(input: ProviderVerificationInput): Promise<NormalizedBillingVerification>;
};

export function getBillingProviderAdapter(provider: SupportedBillingProvider): BillingProviderAdapter {
  if (provider === "khalti") {
    return khaltiAdapter;
  }

  if (provider === "esewa") {
    return esewaAdapter;
  }

  throw new BillingError("UNSUPPORTED_PROVIDER", "This payment provider is not supported.", 400, {
    provider,
  });
}

const khaltiAdapter: BillingProviderAdapter = {
  provider: "khalti",
  async createCheckout({ payment, storeName, customerEmail, customerPhone }) {
    const secret = process.env.KHALTI_SECRET_KEY;
    const baseUrl = process.env.KHALTI_BASE_URL ?? "https://dev.khalti.com/api/v2";

    if (!secret) {
      throw new BillingError(
        "BILLING_NOT_CONFIGURED",
        "Khalti billing is not configured yet.",
        500,
      );
    }

    const plan = getBillablePlanConfig(payment.plan_type);
    const response = await fetch(`${baseUrl}/epayment/initiate/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: `${getBillingAppUrl()}/api/billing/callback/khalti`,
        website_url: getBillingAppUrl(),
        amount: payment.amount_minor,
        purchase_order_id: payment.purchase_order_id,
        purchase_order_name: `${plan.label} - ${storeName}`,
        customer_info: {
          name: storeName,
          email: customerEmail ?? undefined,
          phone: customerPhone ?? undefined,
        },
      }),
    });

    const raw = (await response.json()) as Record<string, unknown>;
    if (!response.ok || typeof raw.payment_url !== "string") {
      throw new BillingError(
        "PAYMENT_INIT_FAILED",
        typeof raw.detail === "string" ? raw.detail : "Unable to start Khalti payment.",
        502,
        { provider: "khalti", raw },
      );
    }

    return {
      kind: "redirect",
      url: raw.payment_url,
      providerReferenceId: typeof raw.pidx === "string" ? raw.pidx : null,
      raw,
    };
  },

  async verifyPayment({ payment, callbackData }) {
    const secret = process.env.KHALTI_SECRET_KEY;
    const baseUrl = process.env.KHALTI_BASE_URL ?? "https://dev.khalti.com/api/v2";
    const pidx =
      typeof callbackData.pidx === "string"
        ? callbackData.pidx
        : payment.provider_reference_id;

    if (!secret || !pidx) {
      throw new BillingError(
        "INVALID_PROVIDER_CALLBACK",
        "Khalti callback data is incomplete.",
        400,
        { provider: "khalti" },
      );
    }

    const response = await fetch(`${baseUrl}/epayment/lookup/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });

    const rawLookup = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BillingError(
        "PAYMENT_VERIFICATION_FAILED",
        typeof rawLookup.detail === "string"
          ? rawLookup.detail
          : "Unable to verify Khalti payment.",
        502,
        { provider: "khalti", rawLookup },
      );
    }

    const providerStatus = String(rawLookup.status ?? callbackData.status ?? "Unknown");
    const verified = providerStatus.toLowerCase() === "completed";
    const paymentStatus =
      providerStatus.toLowerCase() === "completed"
        ? "verified"
        : providerStatus.toLowerCase() === "pending"
          ? "pending"
          : providerStatus.toLowerCase() === "user canceled"
            ? "cancelled"
            : "failed";

    return {
      provider: "khalti",
      purchaseOrderId: String(rawLookup.purchase_order_id ?? payment.purchase_order_id),
      externalPaymentId: rawLookup.transaction_id ? String(rawLookup.transaction_id) : null,
      externalReference: pidx,
      amountMinor: Number(rawLookup.total_amount ?? payment.amount_minor),
      currency: payment.currency,
      verified,
      paymentStatus,
      providerStatus,
      paidAt: verified ? new Date().toISOString() : null,
      rawResponse: {
        callback: callbackData,
        lookup: rawLookup,
      },
    };
  },
};

const esewaAdapter: BillingProviderAdapter = {
  provider: "esewa",
  async createCheckout({ payment, storeName }) {
    const productCode = process.env.ESEWA_PRODUCT_CODE;
    const secret = process.env.ESEWA_SECRET_KEY;
    const actionUrl =
      process.env.ESEWA_FORM_URL ?? "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

    if (!productCode || !secret) {
      throw new BillingError(
        "BILLING_NOT_CONFIGURED",
        "eSewa billing is not configured yet.",
        500,
      );
    }

    const amount = formatEsewaAmount(payment.amount_minor);
    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    const successUrl = `${getBillingAppUrl()}/api/billing/callback/esewa/success`;
    const failureUrl = `${getBillingAppUrl()}/api/billing/callback/esewa/failure?transaction_uuid=${encodeURIComponent(payment.purchase_order_id)}`;
    const signature = signEsewa(
      {
        total_amount: amount,
        transaction_uuid: payment.purchase_order_id,
        product_code: productCode,
      },
      signedFieldNames,
      secret,
    );

    return {
      kind: "form",
      actionUrl,
      method: "POST",
      fields: {
        amount,
        tax_amount: "0",
        total_amount: amount,
        transaction_uuid: payment.purchase_order_id,
        product_code: productCode,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: signedFieldNames,
        signature,
      },
      providerReferenceId: payment.purchase_order_id,
      raw: {
        provider: "esewa",
        storeName,
        actionUrl,
      },
    };
  },

  async verifyPayment({ payment, callbackData }) {
    const productCode = process.env.ESEWA_PRODUCT_CODE;
    const secret = process.env.ESEWA_SECRET_KEY;
    const statusUrl =
      process.env.ESEWA_STATUS_CHECK_URL ??
      "https://rc.esewa.com.np/api/epay/transaction/status/";

    if (!productCode || !secret) {
      throw new BillingError(
        "BILLING_NOT_CONFIGURED",
        "eSewa billing is not configured yet.",
        500,
      );
    }

    const callbackPayload = normalizeEsewaCallback(callbackData);
    if (!callbackPayload.transaction_uuid) {
      throw new BillingError(
        "INVALID_PROVIDER_CALLBACK",
        "eSewa callback did not include a transaction reference.",
        400,
      );
    }

    const signatureIsValid = verifyEsewaResponseSignature(callbackPayload, secret);
    if (!signatureIsValid) {
      throw new BillingError(
        "INVALID_PROVIDER_CALLBACK",
        "eSewa callback signature is invalid.",
        400,
      );
    }

    const statusQuery = new URLSearchParams({
      product_code: productCode,
      total_amount: callbackPayload.total_amount ?? formatEsewaAmount(payment.amount_minor),
      transaction_uuid: callbackPayload.transaction_uuid,
    });

    const response = await fetch(`${statusUrl}?${statusQuery.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const rawLookup = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BillingError(
        "PAYMENT_VERIFICATION_FAILED",
        "Unable to verify eSewa payment status.",
        502,
        { provider: "esewa", rawLookup },
      );
    }

    const providerStatus = String(rawLookup.status ?? callbackPayload.status ?? "Unknown");
    const normalizedStatus = providerStatus.toUpperCase();
    const verified = normalizedStatus === "COMPLETE";
    const paymentStatus =
      normalizedStatus === "COMPLETE"
        ? "verified"
        : normalizedStatus === "PENDING"
          ? "pending"
          : normalizedStatus === "CANCELED"
            ? "cancelled"
            : "failed";

    return {
      provider: "esewa",
      purchaseOrderId: callbackPayload.transaction_uuid,
      externalPaymentId:
        rawLookup.transaction_code != null ? String(rawLookup.transaction_code) : null,
      externalReference:
        rawLookup.ref_id != null
          ? String(rawLookup.ref_id)
          : callbackPayload.transaction_code ?? callbackPayload.transaction_uuid,
      amountMinor: Number(parseFloat(String(rawLookup.total_amount ?? callbackPayload.total_amount ?? formatEsewaAmount(payment.amount_minor))) * 100),
      currency: payment.currency,
      verified,
      paymentStatus,
      providerStatus,
      paidAt: verified ? new Date().toISOString() : null,
      rawResponse: {
        callback: callbackPayload,
        lookup: rawLookup,
      },
    };
  },
};

function normalizeEsewaCallback(callbackData: Record<string, unknown>) {
  const encodedData =
    typeof callbackData.data === "string"
      ? callbackData.data
      : typeof callbackData.raw === "string"
        ? callbackData.raw
        : null;

  if (!encodedData) {
    return {
      transaction_uuid:
        typeof callbackData.transaction_uuid === "string" ? callbackData.transaction_uuid : null,
      total_amount:
        typeof callbackData.total_amount === "string" ? callbackData.total_amount : null,
      status: typeof callbackData.status === "string" ? callbackData.status : null,
      transaction_code:
        typeof callbackData.transaction_code === "string" ? callbackData.transaction_code : null,
      ref_id: typeof callbackData.ref_id === "string" ? callbackData.ref_id : null,
      signature: typeof callbackData.signature === "string" ? callbackData.signature : null,
      signed_field_names:
        typeof callbackData.signed_field_names === "string"
          ? callbackData.signed_field_names
          : null,
    };
  }

  const decoded = Buffer.from(encodedData, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as Record<string, unknown>;

  return {
    transaction_uuid:
      typeof parsed.transaction_uuid === "string" ? parsed.transaction_uuid : null,
    total_amount: typeof parsed.total_amount === "string" ? parsed.total_amount : null,
    status: typeof parsed.status === "string" ? parsed.status : null,
    transaction_code:
      typeof parsed.transaction_code === "string" ? parsed.transaction_code : null,
    ref_id: typeof parsed.ref_id === "string" ? parsed.ref_id : null,
    signature: typeof parsed.signature === "string" ? parsed.signature : null,
    signed_field_names:
      typeof parsed.signed_field_names === "string" ? parsed.signed_field_names : null,
  };
}

function verifyEsewaResponseSignature(
  payload: {
    total_amount: string | null;
    transaction_uuid: string | null;
    status: string | null;
    transaction_code: string | null;
    ref_id: string | null;
    signature: string | null;
    signed_field_names: string | null;
  },
  secret: string,
) {
  if (!payload.signature || !payload.signed_field_names) {
    return false;
  }

  const signedFields = payload.signed_field_names.split(",").map((field) => field.trim());
  const values: Record<string, string> = {
    total_amount: payload.total_amount ?? "",
    transaction_uuid: payload.transaction_uuid ?? "",
    product_code: process.env.ESEWA_PRODUCT_CODE ?? "",
    status: payload.status ?? "",
    transaction_code: payload.transaction_code ?? "",
    ref_id: payload.ref_id ?? "",
  };
  const message = signedFields.map((field) => `${field}=${values[field] ?? ""}`).join(",");
  const expected = createHmac("sha256", secret).update(message).digest("base64");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(payload.signature));
  } catch {
    return false;
  }
}

function signEsewa(
  fields: Record<string, string>,
  signedFieldNames: string,
  secret: string,
) {
  const message = signedFieldNames
    .split(",")
    .map((field) => field.trim())
    .map((field) => `${field}=${fields[field] ?? ""}`)
    .join(",");

  return createHmac("sha256", secret).update(message).digest("base64");
}

function formatEsewaAmount(amountMinor: number) {
  return (amountMinor / 100).toFixed(2);
}
