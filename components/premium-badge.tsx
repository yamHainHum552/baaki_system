"use client";

export function PremiumBadge({
  label = "Premium",
}: {
  label?: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-moss">
      {label}
    </span>
  );
}
