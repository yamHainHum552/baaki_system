import { cn } from "@/lib/utils";

function BrandMark({ size }: { size: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-[22%] border border-khata/15 bg-[#fbf7f0] shadow-[0_14px_34px_rgba(82,40,27,0.14)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="64" height="64" rx="18" fill="#FBF7F0" />
        <path
          d="M11 8.5C11 7.11929 12.1193 6 13.5 6H22V58H13.5C12.1193 58 11 56.8807 11 55.5V8.5Z"
          fill="#AB2E20"
        />
        <path
          d="M20 10H48.5C51.5376 10 54 12.4624 54 15.5V48.5C54 51.5376 51.5376 54 48.5 54H20V10Z"
          fill="#FFFDFC"
        />
        <path d="M28 20H47" stroke="#AB2E20" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M28 28H47" stroke="#D2B8A0" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M28 36H43" stroke="#D2B8A0" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M28 44H39" stroke="#D2B8A0" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M35.5 40.5L39.8 44.8L47.6 32.4"
          stroke="#39604F"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16.5" cy="18.5" r="1.7" fill="#F7D4CF" />
        <circle cx="16.5" cy="28.5" r="1.7" fill="#F7D4CF" />
        <circle cx="16.5" cy="38.5" r="1.7" fill="#F7D4CF" />
        <circle cx="16.5" cy="48.5" r="1.7" fill="#F7D4CF" />
      </svg>
    </div>
  );
}

export function BrandLogo({
  className,
  markSize = 46,
  showWordmark = true,
  compact = false,
}: {
  className?: string;
  markSize?: number;
  showWordmark?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark size={markSize} />
      {showWordmark ? (
        <div className="min-w-0">
          <div
            className={cn(
              "truncate font-serif leading-none text-ink",
              compact ? "text-xl" : "text-2xl sm:text-[1.9rem]",
            )}
          >
            Baaki
          </div>
          <p
            className={cn(
              "truncate text-ink/60",
              compact
                ? "mt-0.5 text-[11px] uppercase tracking-[0.22em]"
                : "mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] sm:text-xs",
            )}
          >
            Digital khata
          </p>
        </div>
      ) : null}
    </div>
  );
}
