import { NextResponse } from "next/server";
import { recordBillingWebhookEvent } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const provider = request.headers.get("x-billing-provider") ?? "manual";
    const payload = await request.json();

    await recordBillingWebhookEvent(supabase, {
      provider,
      eventType: String(payload?.type ?? "unknown"),
      payload,
      storeId: typeof payload?.store_id === "string" ? payload.store_id : null,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook received. Provider-specific processing can be added here later.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to accept billing webhook." },
      { status: 400 },
    );
  }
}
