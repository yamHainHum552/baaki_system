import { NextResponse } from "next/server";
import { findDuplicateCustomers } from "@/lib/customer-duplicates";
import { getStoreContextForApi } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const context = await getStoreContextForApi();
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const url = new URL(request.url);
    const name = url.searchParams.get("name")?.trim() ?? "";
    const phone = url.searchParams.get("phone")?.trim() ?? "";
    const address = url.searchParams.get("address")?.trim() ?? "";
    const search = phone || name;

    if (search.length < 3) {
      return NextResponse.json({ matches: [] });
    }

    const { data, error } = await context.supabase
      .rpc("search_customer_candidates", {
        p_store_id: context.store.id,
        p_query: search,
        p_limit: 12,
      });

    if (error) {
      throw new Error(error.message);
    }

    const matches = findDuplicateCustomers(
      { name, phone, address },
      (data ?? []).map((customer: any) => ({
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        phone: customer.phone ?? null,
        address: customer.address ?? null,
      })),
    ).slice(0, 5);

    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to check duplicates." },
      { status: 400 },
    );
  }
}
