import { NextResponse } from "next/server";
import { getAdminContextForApi, listAdminStores } from "@/lib/admin";

export async function GET(request: Request) {
  const context = await getAdminContextForApi();
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const url = new URL(request.url);
  const stores = await listAdminStores(context.adminClient, {
    search: url.searchParams.get("q") ?? undefined,
    plan: url.searchParams.get("plan") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });

  return NextResponse.json(stores);
}
