import { NextResponse } from "next/server";
import { getAdminContextForApi, getPlatformOverview } from "@/lib/admin";

export async function GET() {
  const context = await getAdminContextForApi();
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const overview = await getPlatformOverview(context.adminClient);
  return NextResponse.json(overview);
}
