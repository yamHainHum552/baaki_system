"use client";

import { PremiumBadge } from "@/components/premium-badge";
import { useToast } from "@/components/toast-provider";
import type { FeatureAccess } from "@/lib/entitlements";
import { useMemo, useState } from "react";

export function ShareActions({
  customerId,
  customerName,
  amount,
  access,
  embedded = false,
}: {
  customerId: string;
  customerName: string;
  amount: number;
  access: FeatureAccess;
  embedded?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [message, setMessage] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const { pushToast } = useToast();
  const shareText = useMemo(
    () => `${customerName} ko Rs. ${Math.round(amount)} baaki cha.`,
    [amount, customerName]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setMessage("Share text copied.");
      pushToast({
        title: "Copied",
        description: "Customer share text copied to clipboard.",
        tone: "success",
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage("Could not copy share text on this device.");
      pushToast({
        title: "Copy failed",
        description: "Could not copy share text on this device.",
        tone: "error",
      });
    }
  }

  async function handleCreateLink() {
    setCreatingLink(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/share-token`, {
        method: "POST"
      });
      const data = await response.json();

      if (response.ok) {
        setShareLink(data.url);
        try {
          await navigator.clipboard.writeText(data.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          setMessage("Share link created and copied.");
          pushToast({
            title: "Share link ready",
            description: "Read-only share link created and copied.",
            tone: "success",
          });
        } catch {
          setMessage("Share link created.");
          pushToast({
            title: "Share link ready",
            description: "Read-only share link created.",
            tone: "success",
          });
        }
        return;
      }

      const nextMessage = data.error ?? "Unable to create share link.";
      setMessage(nextMessage);
      pushToast({
        title: "Share failed",
        description: nextMessage,
        tone: "error",
      });
    } catch {
      setMessage("Network error while creating the share link.");
      pushToast({
        title: "Share failed",
        description: "Network error while creating the share link.",
        tone: "error",
      });
    } finally {
      setCreatingLink(false);
    }
  }

  return (
    <div
      className={[
        "compact-section-spacing rounded-3xl p-3 sm:p-4",
        embedded
          ? "border border-line/75 bg-white/75"
          : "border border-line bg-paper",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Share with customer</p>
        {!access.allowed ? <PremiumBadge /> : null}
      </div>
      <p className="line-clamp-2 text-sm text-ink/70">{shareText}</p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="button-secondary"
        >
          {copied ? "Copied" : "Copy text"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="button-secondary text-center"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={handleCreateLink}
          disabled={!access.allowed || creatingLink}
          className="button-secondary"
        >
          {creatingLink ? "Creating..." : "Create link"}
        </button>
      </div>
      {!access.allowed ? (
        <div className="rounded-2xl bg-warm px-3 py-2.5">
          <p className="text-xs text-ink/65">
            {access.reason === "plan_limit"
              ? "This store has reached the current monthly share-link limit."
              : "Read-only share links unlock more fully on Premium or during trial."}
          </p>
        </div>
      ) : null}
      {shareLink ? (
        <p className="break-all text-xs text-ink/65">
          Read-only link: <span className="font-medium text-ink">{shareLink}</span>
        </p>
      ) : null}
      {message ? <p className="text-xs text-ink/65">{message}</p> : null}
    </div>
  );
}
