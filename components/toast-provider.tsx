"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title?: string;
  description: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: string;
};

type ToastContextValue = {
  pushToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback(
    ({ tone = "info", durationMs = 3200, ...input }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, tone, durationMs, ...input }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-3 sm:bottom-6 sm:right-6 sm:left-auto sm:justify-end sm:px-0">
        <div className="flex w-full max-w-sm flex-col gap-2.5 sm:w-[360px]">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-card toast-${toast.tone} pointer-events-auto`}
              role="status"
              aria-live="polite"
            >
              <div className="min-w-0">
                {toast.title ? (
                  <p className="text-sm font-semibold text-ink">{toast.title}</p>
                ) : null}
                <p className="mt-1 text-sm text-ink/75">{toast.description}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 rounded-full border border-line/70 bg-white/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55 hover:bg-white"
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("Toast context is not available.");
  }

  return context;
}
