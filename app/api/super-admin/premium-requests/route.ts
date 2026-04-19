import { NextResponse } from "next/server";
import { getAdminContextForApi, listPremiumRequests } from "@/lib/admin";

export async function GET() {
  const context = await getAdminContextForApi();
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const requests = await listPremiumRequests(context.adminClient);
  return NextResponse.json(requests);
}
