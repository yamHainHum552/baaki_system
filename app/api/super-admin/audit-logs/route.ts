import { NextResponse } from "next/server";
import { getAdminContextForApi, listAdminAuditLogs } from "@/lib/admin";

export async function GET() {
  const context = await getAdminContextForApi();
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const logs = await listAdminAuditLogs(context.adminClient);
  return NextResponse.json(logs);
}
