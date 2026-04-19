import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/baaki";
import { requireFeatureAccess } from "@/lib/entitlements";
import { getStoreContextForApi } from "@/lib/auth";
import { toPremiumErrorPayload } from "@/lib/premium-errors";

export async function GET() {
  try {
    const context = await getStoreContextForApi();
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    await requireFeatureAccess({
      supabase: context.supabase,
      storeId: context.store.id,
      feature: "advanced_reports",
    });

    const summary = await getDashboardSummary(
      context.supabase,
      context.store.id,
      context.store.risk_threshold,
      context.store.entitlements,
    );

    return NextResponse.json(summary);
  } catch (error) {
    const premiumError = toPremiumErrorPayload(error);
    return NextResponse.json(
      premiumError.status === 400
        ? { error: error instanceof Error ? error.message : "Unable to load analytics." }
        : premiumError,
      { status: premiumError.status }
    );
  }
}
