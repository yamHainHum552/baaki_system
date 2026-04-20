import { NextResponse } from "next/server";
import { incrementStoreUsage, requireFeatureAccess } from "@/lib/entitlements";
import { logSubscriptionEvent } from "@/lib/billing";
import { getStoreContextForApiWithPermission } from "@/lib/auth";
import { toPremiumErrorPayload } from "@/lib/premium-errors";
import { createShareToken } from "@/lib/shares";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let context: Awaited<ReturnType<typeof getStoreContextForApiWithPermission>> | null = null;
  try {
    context = await getStoreContextForApiWithPermission("share_customer_ledger");
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    await requireFeatureAccess({
      supabase: context.supabase,
      storeId: context.store.id,
      feature: "customer_share",
    });

    const { id } = await params;
    const token = await createShareToken(context.supabase, id, context.userId);
    await incrementStoreUsage(context.supabase, context.store.id, "share_links");
    const url = new URL(request.url);
    const shareUrl = `${url.origin}/k/${id}?token=${token.token}`;

    return NextResponse.json({
      token: token.token,
      expires_at: token.expires_at,
      url: shareUrl
    });
  } catch (error) {
    if (context && !("error" in context) && error instanceof Error && "code" in error) {
      await logSubscriptionEvent(context.supabase, context.store.id, "LIMIT_EXCEEDED_ATTEMPT", {
        area: "share_links",
        message: error.message,
      });
    }

    const premiumError = toPremiumErrorPayload(error);
    return NextResponse.json(
      premiumError.status === 400
        ? { error: error instanceof Error ? error.message : "Unable to create share token." }
        : premiumError,
      { status: premiumError.status }
    );
  }
}
