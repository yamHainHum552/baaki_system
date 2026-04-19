import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className,
  contentClassName,
  summaryRight,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  summaryRight?: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-[28px] border border-line bg-warm shadow-ledger", className)}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div className="min-w-0">
          <h2 className="font-serif text-lg text-ink sm:text-[1.35rem]">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-ink/65 sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {summaryRight}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition group-open:rotate-180">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </div>
      </summary>
      <div className={cn("border-t border-line px-4 py-4 sm:px-5 sm:py-5", contentClassName)}>
        {children}
      </div>
    </details>
  );
}
