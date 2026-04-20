import { NextResponse } from "next/server";
import { getStoreContextForApiWithRole } from "@/lib/auth";
import { type BillablePlanType, type SupportedBillingProvider } from "@/lib/billing-config";
import { toBillingErrorPayload } from "@/lib/billing-errors";
import { createBillingCheckoutSession } from "@/lib/billing-service";

export async function POST(request: Request) {
  const context = await getStoreContextForApiWithRole("OWNER");
  if ("error" in context) {
    return NextResponse.json({ error: context.error, code: "BILLING_PERMISSION_DENIED" }, { status: context.status });
  }

  try {
    const payload = (await request.json()) as {
      provider?: SupportedBillingProvider;
      planType?: BillablePlanType;
    };

    if (!payload.provider || !payload.planType) {
      return NextResponse.json(
        { error: "Provider and plan are required.", code: "PAYMENT_INIT_FAILED" },
        { status: 400 },
      );
    }

    const result = await createBillingCheckoutSession({
      storeId: context.store.id,
      storeName: context.store.name,
      userId: context.userId,
      provider: payload.provider,
      planType: payload.planType,
      customerEmail: null,
      customerPhone: context.store.phone,
    });

    return NextResponse.json(result);
  } catch (error) {
    const billingError = toBillingErrorPayload(error);
    return NextResponse.json(billingError.body, { status: billingError.status });
  }
}
