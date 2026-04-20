"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BaakiLoader } from "@/components/baaki-loader";
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
  const [pendingMode, setPendingMode] = useState<"baaki" | "payment" | null>(null);

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
    if (mode === currentMode) {
      document.getElementById("quick-entry")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setPendingMode(mode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", mode);
    const nextUrl = `${pathname}?${params.toString()}`;
    router.replace(nextUrl, { scroll: false });
    window.setTimeout(() => {
      setPendingMode(null);
      document.getElementById("quick-entry")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
      {pendingMode ? (
        <div className="absolute inset-x-3 bottom-0 mx-auto flex max-w-xl items-center justify-center rounded-[24px] border border-line bg-paper/92 px-4 py-5 shadow-ledger backdrop-blur">
          <BaakiLoader compact />
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto grid max-w-xl grid-cols-4 gap-2 rounded-[24px] border border-line bg-warm/95 p-2 shadow-ledger backdrop-blur transition",
          pendingMode ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
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
