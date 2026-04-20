import { NextResponse } from "next/server";
import { verifyBillingCallback } from "@/lib/billing-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackData = Object.fromEntries(url.searchParams.entries());

  try {
    const result = await verifyBillingCallback({
      provider: "esewa",
      callbackData,
    });

    const redirectUrl = new URL("/settings", url.origin);
    if (result.ok) {
      redirectUrl.searchParams.set(
        "message",
        result.alreadyProcessed
          ? "This eSewa payment was already processed."
          : "Premium activated successfully via eSewa.",
      );
    } else {
      redirectUrl.searchParams.set("error", "eSewa payment could not be verified.");
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const redirectUrl = new URL("/settings", url.origin);
    redirectUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Unable to verify eSewa payment.",
    );
    return NextResponse.redirect(redirectUrl);
  }
}
