import { NextResponse } from "next/server";
import { createCustomer, listCustomersPageWithBalance } from "@/lib/baaki";
import { logSubscriptionEvent } from "@/lib/billing";
import {
  getStoreContextForApi,
  getStoreContextForApiWithPermission,
} from "@/lib/auth";
import { clearCache } from "@/lib/cache";
import { parseJsonObject, parsePositiveInt } from "@/lib/http";
import { toPremiumErrorPayload } from "@/lib/premium-errors";

export async function GET(request: Request) {
  try {
    const context = await getStoreContextForApi();
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    const url = new URL(request.url);
    const customers = await listCustomersPageWithBalance(
      context.supabase,
      context.store.id,
      {
        page: parsePositiveInt(url.searchParams.get("page"), 1, { max: 10000 }),
        pageSize: parsePositiveInt(url.searchParams.get("pageSize"), 20, { max: 100 }),
        search: url.searchParams.get("q") ?? undefined,
        riskThreshold: context.store.risk_threshold,
      },
    );

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load customers." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  let context: Awaited<ReturnType<typeof getStoreContextForApiWithPermission>> | null = null;
  try {
    context = await getStoreContextForApiWithPermission("manage_customers");
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    const body = parseJsonObject(await request.json());
    const customer = await createCustomer(context.supabase, context.store.id, body);
    clearCache(`dashboard:${context.store.id}`);
    clearCache(`customers:${context.store.id}`);

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (context && !("error" in context) && error instanceof Error && "code" in error) {
      await logSubscriptionEvent(context.supabase, context.store.id, "LIMIT_EXCEEDED_ATTEMPT", {
        area: "customers",
        message: error.message,
      });
    }

    const premiumError = toPremiumErrorPayload(error);
    return NextResponse.json(
      premiumError.status === 400
        ? { error: error instanceof Error ? error.message : "Unable to create customer." }
        : premiumError,
      { status: premiumError.status }
    );
  }
}
