import { switchStoreAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function StoreSwitcher({
  stores,
  currentStoreId
}: {
  stores: Array<{
    store_id: string;
    store_name: string;
    role: "OWNER" | "STAFF";
  }>;
  currentStoreId: string;
}) {
  if (stores.length <= 1) {
    return null;
  }

  return (
    <form
      action={switchStoreAction}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
    >
      <select
        name="store_id"
        defaultValue={currentStoreId}
        className="min-w-0 sm:min-w-[230px]"
      >
        {stores.map((store) => (
          <option
            key={store.store_id}
            value={store.store_id}
          >
            {store.store_name} ({store.role})
          </option>
        ))}
      </select>
      <SubmitButton
        idle="Switch"
        pending="Switching..."
        className="button-secondary w-full sm:w-auto"
      />
    </form>
  );
}
