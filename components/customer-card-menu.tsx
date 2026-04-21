"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

export function CustomerCardMenu({
  customerId,
  customerPhone,
  canManageCustomers,
}: {
  customerId: string;
  customerPhone: string | null;
  canManageCustomers: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 192;
      const menuHeight = menuRef.current?.offsetHeight ?? 168;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const nextLeft = Math.min(
        Math.max(12, rect.right - menuWidth),
        viewportWidth - menuWidth - 12,
      );
      const availableBelow = viewportHeight - rect.bottom - 12;
      const availableAbove = rect.top - 12;
      const shouldOpenAbove =
        availableBelow < menuHeight && availableAbove > availableBelow;
      const preferredTop = shouldOpenAbove
        ? rect.top - menuHeight - 8
        : rect.bottom + 8;
      const nextTop = Math.min(
        Math.max(12, preferredTop),
        viewportHeight - menuHeight - 12,
      );

      setPosition({
        top: nextTop,
        left: nextLeft,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const menu = mounted && open
    ? createPortal(
        <div
          ref={menuRef}
          className="floating-menu fixed z-[140] w-48"
          style={{ top: position.top, left: position.left }}
        >
          <Link
            href={`/customers/${customerId}`}
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-warm"
            onClick={() => setOpen(false)}
          >
            <svg className="h-4 w-4 text-khata" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0A9 9 0 113 12a9 9 0 0118 0z" />
            </svg>
            {canManageCustomers ? "Open and manage" : "Open ledger"}
          </Link>
          {customerPhone ? (
            <>
              <a
                href={`tel:${customerPhone}`}
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-warm"
                onClick={() => setOpen(false)}
              >
                <svg className="h-4 w-4 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a2 2 0 011.9 1.37l1 3a2 2 0 01-.45 2.05l-1.6 1.6a16 16 0 006.74 6.74l1.6-1.6a2 2 0 012.05-.45l3 1A2 2 0 0121 15.72V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                </svg>
                Call customer
              </a>
              <a
                href={`sms:${customerPhone}`}
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-warm"
                onClick={() => setOpen(false)}
              >
                <svg className="h-4 w-4 text-ink/65" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
                </svg>
                SMS customer
              </a>
            </>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button h-9 w-9 sm:h-10 sm:w-10"
        aria-label="Customer actions"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg className="h-4.5 w-4.5 text-ink/75" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="12" cy="19" r="1.9" />
        </svg>
      </button>
      {menu}
    </>
  );
}
