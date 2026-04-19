import { BrandLogo } from "@/components/brand-logo";

export function BaakiLoader({
  label = "Loading Baaki",
  detail = "Preparing your khata workspace...",
  compact = false,
}: {
  label?: string;
  detail?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-khata/12" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-khata border-r-moss" />
        <div className="rounded-full bg-paper p-2 shadow-sm">
          <BrandLogo markSize={compact ? 34 : 40} showWordmark={false} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink sm:text-base">{label}</p>
        <p className="text-xs text-ink/60 sm:text-sm">{detail}</p>
      </div>
    </div>
  );
}
