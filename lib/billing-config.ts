import { PLAN_DEFINITIONS, type PlanType } from "@/lib/entitlements";
import { BillingError } from "@/lib/billing-errors";

export type SupportedBillingProvider = "khalti" | "esewa";
export type BillablePlanType = Extract<PlanType, "premium_monthly" | "premium_yearly">;

export type BillingPlanConfig = {
  planType: BillablePlanType;
  label: string;
  billingCycle: "monthly" | "yearly";
  amountMinor: number;
  currency: string;
  durationMonths: number;
  isLive: boolean;
  featuresSummary: string[];
};

const billingFeatures = {
  premium_monthly: [
    "Advanced reports and forecast",
    "SMS reminders",
    "Higher export and sharing limits",
  ],
  premium_yearly: [
    "Advanced reports and forecast",
    "SMS reminders",
    "Best value for long-term stores",
  ],
} satisfies Record<BillablePlanType, string[]>;

export function getBillablePlanConfig(planType: BillablePlanType): BillingPlanConfig {
  const definition = PLAN_DEFINITIONS[planType];
  if (!definition) {
    throw new BillingError("UNSUPPORTED_PLAN", "This plan is not available for billing.", 400, {
      planType,
    });
  }

  return {
    planType,
    label: definition.label,
    billingCycle: definition.billingCycle as "monthly" | "yearly",
    amountMinor: definition.amountMinor,
    currency: definition.currency,
    durationMonths: definition.durationMonths,
    isLive: definition.isLive,
    featuresSummary: billingFeatures[planType],
  };
}

export function listBillingPlans() {
  return (["premium_yearly", "premium_monthly"] as BillablePlanType[]).map(getBillablePlanConfig);
}

export function getBillingProviderAvailability() {
  return {
    khalti: Boolean(process.env.KHALTI_SECRET_KEY && process.env.KHALTI_PUBLIC_KEY),
    esewa: Boolean(process.env.ESEWA_SECRET_KEY && process.env.ESEWA_PRODUCT_CODE),
  } satisfies Record<SupportedBillingProvider, boolean>;
}

export function getBillingAppUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;

  if (!raw) {
    throw new BillingError(
      "BILLING_NOT_CONFIGURED",
      "NEXT_PUBLIC_APP_URL is required for billing callbacks.",
      500,
    );
  }

  return new URL(raw).origin;
}

export function formatAmountMinor(amountMinor: number) {
  return amountMinor / 100;
}
