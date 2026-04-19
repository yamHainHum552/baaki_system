import { cn, formatNumber, formatUsageLimit } from "@/lib/utils";

export function UsageProgress({
  label,
  used,
  limit,
  tone = "khata",
}: {
  label: string;
  used: number;
  limit: number;
  tone?: "khata" | "moss" | "ink";
}) {
  const unlimited = limit >= 1000000;
  const percentage = unlimited ? 10 : Math.min(Math.round((used / Math.max(limit, 1)) * 100), 100);
  const barClass =
    tone === "moss"
      ? "bg-moss"
      : tone === "ink"
        ? "bg-ink"
        : "bg-khata";

  return (
    <div className="soft-panel px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-ink/55">
          {formatNumber(used)} / {formatUsageLimit(limit)}
        </p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/80">
        <div
          className={cn("h-2 rounded-full transition-all", barClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
