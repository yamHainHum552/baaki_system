"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast-provider";

export function UrlToastSync() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToast();
  const shownKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const message = searchParams.get("message");
    const error = searchParams.get("error");

    if (!message && !error) {
      return;
    }

    const key = `${pathname}|${message ?? ""}|${error ?? ""}`;
    if (shownKeys.current.has(key)) {
      return;
    }

    shownKeys.current.add(key);

    if (message) {
      pushToast({
        title: "Done",
        description: message,
        tone: "success",
      });
    }

    if (error) {
      pushToast({
        title: "Something went wrong",
        description: error,
        tone: "error",
        durationMs: 4200,
      });
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("message");
    nextParams.delete("error");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, pushToast, router, searchParams]);

  return null;
}
