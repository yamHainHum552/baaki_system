"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (process.env.NODE_ENV !== "production" && !isLocalhost) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // A failed registration should not block the app.
    });
  }, []);

  return null;
}
