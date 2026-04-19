"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { StoreSwitcher } from "@/components/store-switcher";
import { cn, formatEntitlementPlanLabel } from "@/lib/utils";

export function AppShellHeader({
  store,
}: {
  store: {
    id: string;
    name: string;
    role: "OWNER" | "STAFF";
    subscription_plan: "FREE" | "PREMIUM";
    entitlements: {
      isTrialing: boolean;
      displayPlanLabel: string;
    };
    subscription: {
      plan_type: "free" | "premium_monthly" | "premium_yearly";
    };
    memberships: Array<{
      store_id: string;
      store_name: string;
      role: "OWNER" | "STAFF";
    }>;
  };
}) {
  const pathname = usePathname();
  const isCustomerArea = pathname.startsWith("/customers");
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/customers", label: "Customers" },
    { href: "/account", label: "Account" },
    ...(store.role === "OWNER" ? [{ href: "/settings", label: "Settings" }] : []),
  ];

  if (isCustomerArea) {
    return (
      <header className="surface-panel p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav
            className={`grid gap-3 ${
              navItems.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : navItems.length === 3 ? "grid-cols-3" : "grid-cols-2"
            } sm:max-w-2xl`}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-2xl border border-line bg-paper px-4 py-3 text-center text-sm font-semibold text-ink transition hover:bg-white",
                  pathname === item.href ? "bg-white shadow-sm" : "",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <StoreSwitcher
              stores={store.memberships}
              currentStoreId={store.id}
            />
            <form action={signOutAction}>
              <SubmitButton
                idle="Sign out"
                pending="Signing out..."
                className="button-secondary w-full sm:w-auto"
              />
            </form>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="surface-panel p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-khata">
            Baaki
          </p>
          <h1 className="mt-2 truncate font-serif text-2xl text-ink sm:text-3xl">
            {store.name}
          </h1>
          <p className="mt-2 text-sm text-ink/65 sm:text-base">
            {store.role === "OWNER"
              ? "Simple shop khata. Record now, collect later."
              : "Staff workspace for daily khata work."}{" "}
            {store.role} -{" "}
            {store.entitlements.isTrialing
              ? store.entitlements.displayPlanLabel
              : formatEntitlementPlanLabel(store.subscription.plan_type)}
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <StoreSwitcher
            stores={store.memberships}
            currentStoreId={store.id}
          />
          <form action={signOutAction}>
            <SubmitButton
              idle="Sign out"
              pending="Signing out..."
              className="button-secondary w-full sm:w-auto"
            />
          </form>
        </div>
      </div>

      <nav className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-2xl border border-line bg-paper px-4 py-3 text-center text-sm font-semibold text-ink hover:bg-white sm:px-5",
              pathname === item.href ? "bg-white shadow-sm" : "",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
