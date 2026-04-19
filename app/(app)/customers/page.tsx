import { CustomersWorkspace } from "@/components/customers-workspace";
import { listCustomersWithBalance } from "@/lib/baaki";
import { requireStoreContext } from "@/lib/auth";

export default async function CustomersPage() {
  const { supabase, store } = await requireStoreContext();
  const customers = await listCustomersWithBalance(
    supabase,
    store.id,
    undefined,
    store.risk_threshold,
  );

  return (
    <CustomersWorkspace
      customers={customers}
      isOwner={store.role === "OWNER"}
    />
  );
}
