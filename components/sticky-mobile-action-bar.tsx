import { cn } from "@/lib/utils";

export function StickyMobileActionBar({
  customerId,
}: {
  customerId: string;
}) {
  const items = [
    { href: `#quick-entry`, label: "Add", tone: "bg-khata text-white" },
    { href: `?mode=payment#quick-entry`, label: "Payment", tone: "bg-moss text-white" },
    { href: "#customer-actions", label: "Actions", tone: "bg-paper text-ink border border-line" },
    { href: "#ledger-list", label: "Ledger", tone: "bg-paper text-ink border border-line" },
  ];

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-2 rounded-[24px] border border-line bg-warm/95 p-2 shadow-ledger backdrop-blur">
        {items.map((item) => (
          <a
            key={`${customerId}-${item.label}`}
            href={item.href}
            className={cn(
              "rounded-2xl px-2 py-2 text-center text-xs font-semibold",
              item.tone,
            )}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
