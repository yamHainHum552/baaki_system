"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function StickyMobileActionBar({
  customerId,
  currentMode,
}: {
  customerId: string;
  currentMode: "baaki" | "payment";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const items = [
    {
      label: "Baaki",
      tone: currentMode === "baaki" ? "bg-khata text-white" : "bg-paper text-ink border border-line",
      onClick: () => switchMode("baaki"),
    },
    {
      label: "Payment",
      tone: currentMode === "payment" ? "bg-moss text-white" : "bg-paper text-ink border border-line",
      onClick: () => switchMode("payment"),
    },
    {
      label: "Actions",
      tone: "bg-paper text-ink border border-line",
      onClick: () => scrollToSection("customer-tools"),
    },
    {
      label: "Ledger",
      tone: "bg-paper text-ink border border-line",
      onClick: () => scrollToSection("ledger-list"),
    },
  ];

  function scrollToSection(id: string) {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function switchMode(mode: "baaki" | "payment") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", mode);
    const nextUrl = `${pathname}?${params.toString()}`;
    router.replace(nextUrl, { scroll: false });
    window.setTimeout(() => {
      document.getElementById("quick-entry")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-2 rounded-[24px] border border-line bg-warm/95 p-2 shadow-ledger backdrop-blur">
        {items.map((item) => (
          <button
            key={`${customerId}-${item.label}`}
            type="button"
            onClick={item.onClick}
            className={cn(
              "rounded-2xl px-2 py-2 text-center text-xs font-semibold",
              item.tone,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
