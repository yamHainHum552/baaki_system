"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/customers", label: "Customers" },
      ...(store.role === "OWNER"
        ? [{ href: "/settings", label: "Settings" }]
        : []),
      { href: "/account", label: "Profile" },
    ],
    [store.role],
  );
  const roleLabel = store.role === "OWNER" ? "Owner" : "Staff";
  const accountLabel = store.name.trim().charAt(0).toUpperCase() || "B";
  const planLabel = store.entitlements.isTrialing
    ? store.entitlements.displayPlanLabel
    : formatEntitlementPlanLabel(store.subscription.plan_type);

  return (
    <>
      <header className="surface-panel p-3 sm:p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo markSize={38} compact className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink sm:text-base">
                {store.name}
              </p>
              <p className="mt-0.5 text-xs text-ink/55">
                {roleLabel} · {planLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="icon-button h-11 w-11 shrink-0 lg:hidden"
            aria-label="Open navigation menu"
          >
            <svg
              className="h-5 w-5 text-ink/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7h16M4 12h16M4 17h16"
              />
            </svg>
          </button>

          <div className="hidden min-w-0 flex-1 items-center justify-between gap-4 lg:flex">
            <nav className="flex min-w-0 flex-wrap items-center gap-2">
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

            <div className="flex items-center gap-2">
              <StoreSwitcher
                stores={store.memberships}
                currentStoreId={store.id}
              />

              <form action={signOutAction}>
                <SubmitButton
                  idle="Sign out"
                  pending="Signing out..."
                  className="button-secondary"
                />
              </form>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="dialog-backdrop fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <div className="absolute right-3 top-3 w-[min(360px,calc(100vw-1.5rem))] rounded-[30px] border border-line bg-warm p-4 shadow-[0_28px_70px_rgba(82,40,27,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {store.name}
                </p>
                <p className="mt-1 text-xs text-ink/55">
                  {roleLabel} · {planLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="icon-button h-10 w-10 shrink-0"
                aria-label="Close navigation menu"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <StoreSwitcher
                stores={store.memberships}
                currentStoreId={store.id}
              />
            </div>

            <nav className="mt-4 grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                    pathname === item.href
                      ? "border-line bg-paper text-ink shadow-sm"
                      : "border-transparent bg-white/55 text-ink/75 hover:bg-paper",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 rounded-[24px] border border-line/80 bg-paper/80 p-3">
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-khata text-sm font-semibold text-white shadow-sm">
                  {accountLabel}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    Profile
                  </span>
                  <span className="block truncate text-xs text-ink/55">
                    {roleLabel}
                  </span>
                </span>
              </Link>
            </div>

            <form action={signOutAction} className="mt-4">
              <SubmitButton
                idle="Sign out"
                pending="Signing out..."
                className="button-secondary w-full"
              />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
