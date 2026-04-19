"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
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
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/customers", label: "Customers" },
    { href: "/account", label: "Account" },
    ...(store.role === "OWNER" ? [{ href: "/settings", label: "Settings" }] : []),
  ];
  const roleLabel = store.role === "OWNER" ? "Owner" : "Staff";
  const accountLabel = store.name.trim().charAt(0).toUpperCase() || "B";

  return (
    <header className="surface-panel p-3 sm:p-4 lg:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo markSize={38} compact className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink sm:text-base">{store.name}</p>
            <p className="mt-0.5 text-xs text-ink/55">
              {roleLabel} ·{" "}
              {store.entitlements.isTrialing
                ? store.entitlements.displayPlanLabel
                : formatEntitlementPlanLabel(store.subscription.plan_type)}
            </p>
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap xl:justify-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-2xl border border-transparent px-4 py-2.5 text-center text-sm font-semibold text-ink/72 transition hover:bg-paper hover:text-ink",
                pathname === item.href
                  ? "border-line bg-paper text-ink shadow-sm"
                  : "bg-transparent",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
          <StoreSwitcher stores={store.memberships} currentStoreId={store.id} />
          <Link
            href="/account"
            className="soft-panel flex items-center gap-3 px-3 py-2.5 transition hover:bg-white"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-khata text-sm font-semibold text-white shadow-sm">
              {accountLabel}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">Profile</span>
              <span className="block truncate text-xs text-ink/55">{roleLabel}</span>
            </span>
          </Link>
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
