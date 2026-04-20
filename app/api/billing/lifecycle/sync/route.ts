import { NextResponse } from "next/server";
import { processBillingLifecycle } from "@/lib/billing-lifecycle";

function isAuthorized(request: Request) {
  const secret = process.env.BILLING_CRON_SECRET;
  if (!secret) {
    return false;
  }

  const headerSecret =
    request.headers.get("x-billing-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  return headerSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processBillingLifecycle();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Lifecycle sync failed.",
      },
      { status: 500 },
    );
  }
}
