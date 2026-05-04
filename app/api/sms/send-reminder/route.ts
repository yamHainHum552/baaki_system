import { NextResponse } from "next/server";
import { incrementStoreUsage, requireFeatureAccess } from "@/lib/entitlements";
import { logSubscriptionEvent } from "@/lib/billing";
import { getCustomerLedger } from "@/lib/baaki";
import { getStoreContextForApiWithPermission } from "@/lib/auth";
import { parseJsonObject } from "@/lib/http";
import { toPremiumErrorPayload } from "@/lib/premium-errors";
import { buildReminderMessage, sendSMS, type ReminderTemplate } from "@/lib/sms";

export async function POST(request: Request) {
  let context: Awaited<ReturnType<typeof getStoreContextForApiWithPermission>> | null = null;
  try {
    context = await getStoreContextForApiWithPermission("send_sms_reminders");
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    await requireFeatureAccess({
      supabase: context.supabase,
      storeId: context.store.id,
      feature: "sms_reminders",
    });

    const body = parseJsonObject(await request.json());
    const requestedTemplate = typeof body.template === "string" ? body.template : "";
    const customerId = typeof body.customer_id === "string" ? body.customer_id : "";

    if (!customerId) {
      return NextResponse.json({ error: "customer_id is required." }, { status: 400 });
    }

    const template = ["polite", "due_today", "final"].includes(requestedTemplate)
      ? (requestedTemplate as ReminderTemplate)
      : "polite";
    const ledger = await getCustomerLedger(context.supabase, customerId, {
      riskThreshold: context.store.risk_threshold
    });

    if (!ledger.customer.phone) {
      return NextResponse.json({ error: "Customer phone number is missing." }, { status: 400 });
    }

    const message = buildReminderMessage(ledger.currentBalance, ledger.customer.name, template);
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
