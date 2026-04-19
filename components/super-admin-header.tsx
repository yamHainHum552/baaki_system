"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/super-admin", label: "Overview" },
  { href: "/super-admin/stores", label: "Stores" },
  { href: "/super-admin/premium-requests", label: "Premium Requests" },
  { href: "/super-admin/users", label: "Users" },
  { href: "/super-admin/usage", label: "Usage" },
  { href: "/super-admin/audit-logs", label: "Audit" },
  { href: "/super-admin/analytics", label: "Analytics" },
  { href: "/super-admin/billing-events", label: "Billing Events" },
];

export function SuperAdminHeader({
  role,
  fullName,
}: {
  role: string;
  fullName: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="surface-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-khata">
            Baaki Super Admin
          </p>
          <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
            Platform operations
          </h1>
          <p className="mt-2 text-sm text-ink/65">
            {fullName ?? "Admin"} • {role}
          </p>
        </div>

        <form action={signOutAction}>
          <SubmitButton
            idle="Sign out"
            pending="Signing out..."
            className="button-secondary w-full sm:w-auto"
          />
        </form>
      </div>

      <nav className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4 2xl:grid-cols-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-2xl border border-line bg-paper px-3 py-2.5 text-center text-sm font-semibold text-ink",
              pathname === item.href ? "bg-white shadow-sm" : "hover:bg-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
