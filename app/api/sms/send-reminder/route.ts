import { NextResponse } from "next/server";
import { incrementStoreUsage, requireFeatureAccess } from "@/lib/entitlements";
import { logSubscriptionEvent } from "@/lib/billing";
import { getCustomerLedger } from "@/lib/baaki";
import { getStoreContextForApiWithRole } from "@/lib/auth";
import { toPremiumErrorPayload } from "@/lib/premium-errors";
import { buildReminderMessage, sendSMS } from "@/lib/sms";

export async function POST(request: Request) {
  let context: Awaited<ReturnType<typeof getStoreContextForApiWithRole>> | null = null;
  try {
    context = await getStoreContextForApiWithRole("OWNER");
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    await requireFeatureAccess({
      supabase: context.supabase,
      storeId: context.store.id,
      feature: "sms_reminders",
    });

    const body = await request.json();
    const ledger = await getCustomerLedger(context.supabase, body.customer_id, {
      riskThreshold: context.store.risk_threshold
    });

    if (!ledger.customer.phone) {
      return NextResponse.json({ error: "Customer phone number is missing." }, { status: 400 });
    }

    const message = buildReminderMessage(ledger.currentBalance);
    const result = await sendSMS(ledger.customer.phone, message);
    await incrementStoreUsage(context.supabase, context.store.id, "sms");

    return NextResponse.json({
      success: true,
      provider: result.provider,
      message
    });
  } catch (error) {
    if (context && !("error" in context) && error instanceof Error && "code" in error) {
      await logSubscriptionEvent(context.supabase, context.store.id, "LIMIT_EXCEEDED_ATTEMPT", {
        area: "sms_reminders",
        message: error.message,
      });
    }

    const premiumError = toPremiumErrorPayload(error);
    return NextResponse.json(
      premiumError.status === 400
        ? { error: error instanceof Error ? error.message : "Unable to send reminder." }
        : premiumError,
      { status: premiumError.status }
    );
  }
}
