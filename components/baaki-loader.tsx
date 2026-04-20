import { BrandLogo } from "@/components/brand-logo";

export function BaakiLoader({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-khata/12" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-khata border-r-moss" />
        <div className="rounded-full bg-paper p-2 shadow-sm">
          <BrandLogo markSize={compact ? 34 : 40} showWordmark={false} />
        </div>
      </div>
    </div>
  );
}
