"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useToast } from "@/components/toast-provider";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallAppCard({ className = "" }: { className?: string }) {
  const { pushToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsInstalled(isStandaloneMode());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
      setIsInstalled(false);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const platform = useMemo(() => {
    if (typeof navigator === "undefined") {
      return { isIos: false, isSafari: false };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|android/.test(userAgent);

    return { isIos, isSafari };
  }, []);

  const canShow = !isInstalled && (deferredPrompt || (platform.isIos && platform.isSafari));

  if (!canShow) {
    return null;
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      if (result.outcome === "accepted") {
        setDeferredPrompt(null);
        pushToast({
          tone: "success",
          title: "Baaki installed",
          description: "You can now open Baaki from your home screen like an app.",
        });
      } else {
        pushToast({
          tone: "info",
          title: "Install skipped",
          description: "You can still install Baaki later from your browser menu.",
        });
      }

      return;
    }

    setShowIosHelp((current) => !current);
  }

  return (
    <section className={`surface-panel overflow-hidden p-4 sm:p-5 ${className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <BrandLogo markSize={40} compact showWordmark={false} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-khata">
                Install Baaki
              </p>
              <h2 className="mt-1 font-serif text-xl text-ink sm:text-2xl">
                Keep the khata on your home screen
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-ink/70">
            Open Baaki in one tap, with a cleaner full-screen feel and faster repeat access for daily
            customer work.
          </p>
        </div>

        <button type="button" onClick={handleInstall} className="button-primary shrink-0">
          {deferredPrompt ? "Install app" : showIosHelp ? "Hide steps" : "Show install steps"}
        </button>
      </div>

      {platform.isIos && platform.isSafari ? (
        <div className="mt-4 rounded-[22px] border border-line bg-paper px-4 py-3 text-sm text-ink/70">
          <p className="font-semibold text-ink">iPhone / iPad install</p>
          <p className="mt-1">
            Open the browser share menu, then choose <span className="font-semibold text-ink">Add to
            Home Screen</span>.
          </p>
          {showIosHelp ? (
            <p className="mt-2 text-ink/60">
              After adding it, Baaki will open more like an app and stay easier to reach during shop
              work.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
