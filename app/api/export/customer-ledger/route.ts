import { NextResponse } from "next/server";
import { incrementStoreUsage, requireFeatureAccess } from "@/lib/entitlements";
import { logSubscriptionEvent } from "@/lib/billing";
import { getCustomerLedger } from "@/lib/baaki";
import { getStoreContextForApi } from "@/lib/auth";
import { toPremiumErrorPayload } from "@/lib/premium-errors";
import { customerLedgerToCsv, customerLedgerToPrintableHtml } from "@/lib/export";

export async function GET(request: Request) {
  let context: Awaited<ReturnType<typeof getStoreContextForApi>> | null = null;
  try {
    context = await getStoreContextForApi();
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");
    const format = url.searchParams.get("format") ?? "csv";

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required." }, { status: 400 });
    }

    await requireFeatureAccess({
      supabase: context.supabase,
      storeId: context.store.id,
      feature: format === "pdf" ? "export_pdf" : "export_csv",
    });

    const ledger = await getCustomerLedger(context.supabase, customerId, {
      page: 1,
      pageSize: 1000,
      riskThreshold: context.store.risk_threshold
    });

    if (format === "pdf") {
      const html = customerLedgerToPrintableHtml({
        customerName: ledger.customer.name,
        currentBalance: ledger.currentBalance,
        watermark: context.store.entitlements.isPremium ? null : "Generated on Free Plan",
        rows: ledger.rows
      });

      await incrementStoreUsage(context.supabase, context.store.id, "exports");

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${ledger.customer.name}-ledger.html"`
        }
      });
    }

    const csv = customerLedgerToCsv({
      customerName: ledger.customer.name,
      watermark: context.store.entitlements.isPremium ? null : "Generated on Free Plan",
      rows: ledger.rows
    });

    await incrementStoreUsage(context.supabase, context.store.id, "exports");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ledger.customer.name}-ledger.csv"`
      }
    });
  } catch (error) {
    if (context && !("error" in context) && error instanceof Error && "code" in error) {
      await logSubscriptionEvent(context.supabase, context.store.id, "LIMIT_EXCEEDED_ATTEMPT", {
        area: "exports",
        message: error.message,
      });
    }

    const premiumError = toPremiumErrorPayload(error);
    return NextResponse.json(
      premiumError.status === 400
        ? { error: error instanceof Error ? error.message : "Unable to export ledger." }
        : premiumError,
      { status: premiumError.status }
    );
  }
}
