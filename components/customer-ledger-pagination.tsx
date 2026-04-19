import Link from "next/link";

export function CustomerLedgerPagination({
  customerId,
  mode,
  page,
  totalPages,
}: {
  customerId: string;
  mode: "baaki" | "payment";
  page: number;
  totalPages: number;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Link
        href={`/customers/${customerId}?page=${Math.max(page - 1, 1)}&mode=${mode}`}
        className={`button-secondary w-auto text-center ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
      >
        Prev
      </Link>
      <p className="text-xs text-ink/65 sm:text-sm">
        Page {page} of {totalPages}
      </p>
      <Link
        href={`/customers/${customerId}?page=${Math.min(page + 1, totalPages)}&mode=${mode}`}
        className={`button-secondary w-auto text-center ${
          page >= totalPages ? "pointer-events-none opacity-50" : ""
        }`}
      >
        Next
      </Link>
    </div>
  );
}
