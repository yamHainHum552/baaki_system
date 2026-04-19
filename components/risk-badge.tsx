import { riskClasses, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskBadge({
  level,
  compact = false
}: {
  level: RiskLevel;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        compact ? "px-2 py-1 text-[11px]" : "",
        riskClasses(level)
      )}
    >
      {level}
    </span>
  );
}
