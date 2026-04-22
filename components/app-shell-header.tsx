"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { signOutAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { StoreSwitcher } from "@/components/store-switcher";
import { SubmitButton } from "@/components/submit-button";
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/customers", label: "Customers" },
    ],
    [],
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
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="button-secondary inline-flex h-11 shrink-0 items-center gap-2 px-3 py-2"
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
              <span className="text-sm font-semibold">Menu</span>
            </button>
          </div>

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

            <button
              type="button"
              onClick={() => setAccountMenuOpen(true)}
              className="icon-button h-11 w-11 shrink-0 sm:w-auto sm:gap-2 sm:px-3"
              aria-label="Open account menu"
            >
              {accountIcon()}
              <span className="hidden max-w-[160px] truncate text-sm font-semibold sm:block">
                {store.name}
              </span>
            </button>
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-khata">
                  Navigation
                </p>
                <p className="mt-1 truncate text-sm text-ink/60">
                  {store.name}
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
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAccountMenuOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-khata text-sm font-semibold text-white shadow-sm">
                  {accountLabel}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {store.name}
                  </span>
                  <span className="block truncate text-xs text-ink/55">
                    Account, store, and sign out
                  </span>
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-ink/45"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {accountMenuOpen ? (
        <div className="dialog-backdrop fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setAccountMenuOpen(false)}
            aria-label="Close account menu"
          />

          <aside className="absolute right-3 top-3 flex h-[calc(100vh-1.5rem)] w-[min(380px,calc(100vw-1.5rem))] flex-col rounded-[30px] border border-line bg-warm p-4 shadow-[0_28px_70px_rgba(82,40,27,0.22)] sm:right-5 sm:top-5 sm:h-[calc(100vh-2.5rem)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-khata text-sm font-semibold text-white shadow-sm">
                  {accountLabel}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-ink">
                    {store.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink/55">
                    {roleLabel} {"\u00B7"} {planLabel}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAccountMenuOpen(false)}
                className="icon-button h-10 w-10 shrink-0"
                aria-label="Close account menu"
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

            <div className="mt-5 rounded-[24px] border border-line/80 bg-paper/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                Current Store
              </p>
              <p className="mt-2 truncate text-lg font-semibold text-ink">
                {store.name}
              </p>
              <p className="mt-1 text-sm text-ink/60">
                {roleLabel} access on {planLabel}
              </p>
            </div>

            <div className="mt-3 rounded-[24px] border border-line/80 bg-paper/80 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                Switch Store
              </p>
              <StoreSwitcher
                stores={store.memberships}
                currentStoreId={store.id}
              />
              {store.memberships.length <= 1 ? (
                <p className="text-sm text-ink/60">Only one store is linked to this account.</p>
              ) : null}
            </div>

            <nav className="mt-4 grid gap-2">
              {store.role === "OWNER" ? (
                <Link
                  href="/settings"
                  onClick={() => setAccountMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                    pathname === "/settings"
                      ? "border-line bg-paper text-ink shadow-sm"
                      : "border-transparent bg-white/55 text-ink/75 hover:bg-paper",
                  )}
                >
                  {settingsIcon()}
                  Store settings
                </Link>
              ) : null}

              <Link
                href="/account"
                onClick={() => setAccountMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                  pathname === "/account"
                    ? "border-line bg-paper text-ink shadow-sm"
                    : "border-transparent bg-white/55 text-ink/75 hover:bg-paper",
                )}
              >
                {accountIcon("h-4 w-4")}
                Account settings
              </Link>
            </nav>

            <form action={signOutAction} className="mt-auto pt-4">
              <SubmitButton
                idle="Sign out"
                pending="Signing out..."
                className="button-secondary w-full"
              />
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function settingsIcon(className = "h-4 w-4") {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M10.5 6h9M10.5 12h9M10.5 18h9M4.5 6h.01M4.5 12h.01M4.5 18h.01"
      />
    </svg>
  );
}

function accountIcon(className = "h-5 w-5 text-ink/80") {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
      />
    </svg>
  );
}
