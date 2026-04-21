import Link from "next/link";

export function CustomersPagination({
  page,
  totalPages,
  query,
}: {
  page: number;
  totalPages: number;
  query?: string;
}) {
  const previousHref = buildHref(Math.max(page - 1, 1), query);
  const nextHref = buildHref(Math.min(page + 1, totalPages), query);

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Link
        href={previousHref}
        className={`button-secondary w-auto text-center ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
      >
        Prev
      </Link>
      <p className="text-xs text-ink/65 sm:text-sm">
        Page {page} of {totalPages}
      </p>
      <Link
        href={nextHref}
        className={`button-secondary w-auto text-center ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
      >
        Next
      </Link>
    </div>
  );
}

function buildHref(page: number, query?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `/customers?${search}` : "/customers";
}
