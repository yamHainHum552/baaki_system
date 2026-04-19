import { cn } from "@/lib/utils";

export function AdminStatusBadge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "moss" | "khata" | "amber" | "red";
}) {
  const toneClasses: Record<string, string> = {
    slate: "bg-ink/5 text-ink border-ink/10",
    moss: "bg-moss/10 text-moss border-moss/20",
    khata: "bg-khata/10 text-khata border-khata/20",
    amber: "bg-amber-100 text-amber-900 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        toneClasses[tone],
      )}
    >
      {label}
    </span>
  );
}
