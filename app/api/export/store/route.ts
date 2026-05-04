import { NextResponse } from "next/server";
import { getStoreContextForApiWithPermission } from "@/lib/auth";
import { incrementStoreUsage, requireFeatureAccess } from "@/lib/entitlements";
import { storeBackupToCsv, storeBackupToPrintableHtml } from "@/lib/export";
import { contentDisposition } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const context = await getStoreContextForApiWithPermission("export_customer_ledger");
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "csv";

    if (format !== "csv" && format !== "html" && format !== "pdf") {
      return NextResponse.json({ error: "format must be csv, html, or pdf." }, { status: 400 });
    }

    await requireFeatureAccess({
      supabase: context.supabase,
      storeId: context.store.id,
      feature: "export_csv",
    });

    const [{ data: customers, error: customersError }, { data: ledgerEntries, error: ledgerError }] =
      await Promise.all([
        context.supabase
          .from("customers")
          .select("id, name, phone, address, created_at")
          .eq("store_id", context.store.id)
          .order("created_at", { ascending: true }),
        context.supabase
          .from("ledger_entries")
          .select("customer_id, created_at, description, type, amount")
          .eq("store_id", context.store.id)
          .order("created_at", { ascending: true }),
      ]);

    if (customersError) {
      throw new Error(customersError.message);
    }

    if (ledgerError) {
      throw new Error(ledgerError.message);
    }

    const backup = {
      storeName: context.store.name,
      customers: customers ?? [],
      ledgerEntries: ledgerEntries ?? [],
    };

    await incrementStoreUsage(context.supabase, context.store.id, "exports");

    if (format === "html" || format === "pdf") {
      const html = storeBackupToPrintableHtml({
        ...backup,
        generatedAt: new Date().toISOString(),
      });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": contentDisposition("inline", `${context.store.name}-store-backup.html`),
        },
      });
    }

    const csv = storeBackupToCsv(backup);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": contentDisposition("attachment", `${context.store.name}-store-backup.csv`),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export store backup." },
      { status: 400 },
    );
  }
}
