import { formatCurrency } from "@/lib/utils";

export function CustomersResultsSummary({
  count,
  totalDue,
  mobile = false,
}: {
  count: number;
  totalDue: number;
  mobile?: boolean;
}) {
  return (
    <div
      className={`soft-panel items-center justify-between gap-3 px-3 py-2.5 text-sm ${
        mobile ? "mt-3 flex lg:hidden" : "hidden lg:flex"
      }`}
    >
      <span className="text-ink/65">
        {count} result{count === 1 ? "" : "s"}
      </span>
      <span className="font-semibold text-khata">{formatCurrency(totalDue)}</span>
    </div>
  );
}
