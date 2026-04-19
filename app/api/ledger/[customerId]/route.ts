import { NextResponse } from "next/server";
import { getCustomerLedger } from "@/lib/baaki";
import { getStoreContextForApi } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const context = await getStoreContextForApi();
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    const url = new URL(_request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "50");
    const ledger = await getCustomerLedger(context.supabase, customerId, {
      page,
      pageSize,
      riskThreshold: context.store.risk_threshold
    });

    return NextResponse.json(ledger);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load ledger." },
      { status: 400 }
    );
  }
}
