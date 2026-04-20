import { NextResponse } from "next/server";
import { markBillingFailure } from "@/lib/billing-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transactionReference = url.searchParams.get("transaction_uuid");

  if (transactionReference) {
    await markBillingFailure({
      provider: "esewa",
      transactionReference,
      payload: Object.fromEntries(url.searchParams.entries()),
    });
  }

  const redirectUrl = new URL("/settings", url.origin);
  redirectUrl.searchParams.set("error", "eSewa payment was cancelled or failed.");
  return NextResponse.redirect(redirectUrl);
}
