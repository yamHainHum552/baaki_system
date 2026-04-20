import { NextResponse } from "next/server";
import { createLedgerEntry } from "@/lib/baaki";
import { getStoreContextForApiWithPermission } from "@/lib/auth";
import { clearCache } from "@/lib/cache";

export async function POST(request: Request) {
  try {
    const context = await getStoreContextForApiWithPermission("manage_ledger");
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    const body = await request.json();

    if (body.type !== "BAAKI" && body.type !== "PAYMENT") {
      return NextResponse.json({ error: "Type must be BAAKI or PAYMENT." }, { status: 400 });
    }

    const entry = await createLedgerEntry(context.supabase, context.store.id, {
      customer_id: body.customer_id,
      type: body.type,
      amount: Number(body.amount),
      description: body.description ?? "",
      created_at: body.created_at ?? new Date().toISOString()
    });

    clearCache(`dashboard:${context.store.id}`);
    clearCache(`customers:${context.store.id}`);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create ledger entry." },
      { status: 400 }
    );
  }
}
