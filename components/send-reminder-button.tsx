"use client";

import { PremiumBadge } from "@/components/premium-badge";
import { useToast } from "@/components/toast-provider";
import { useFeatureAccess } from "@/lib/use-feature-access";
import { useState } from "react";

export function SendReminderButton({
  customerId,
  enabled
}: {
  customerId: string;
  enabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const access = useFeatureAccess("sms_reminders");
  const { pushToast } = useToast();

  async function handleClick() {
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/sms/send-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_id: customerId
        })
      });

      const data = await response.json();
      const nextMessage = response.ok ? `Reminder sent via ${data.provider}.` : data.error ?? "Unable to send.";
      setMessage(nextMessage);
      pushToast({
        title: response.ok ? "Reminder sent" : "Reminder failed",
        description: nextMessage,
        tone: response.ok ? "success" : "error",
      });
    } catch {
      const nextMessage = "Network error while sending the reminder.";
      setMessage(nextMessage);
      pushToast({
        title: "Reminder failed",
        description: nextMessage,
        tone: "error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={!enabled || sending || !access.allowed}
        className="button-secondary w-full"
      >
        {sending ? "Sending..." : "Send SMS reminder"}
      </button>
      {!access.allowed ? (
        <div className="rounded-2xl bg-paper px-4 py-3">
          <div className="flex items-center gap-2">
            <PremiumBadge />
            <p className="text-xs text-ink/60">Locked on current plan</p>
          </div>
          <p className="mt-2 text-xs text-ink/55">
            {access.reason === "plan_limit"
              ? "Monthly SMS limit reached for this store."
              : "SMS reminders unlock on Premium or during trial."}
          </p>
        </div>
      ) : null}
      {!enabled ? (
        <p className="text-xs text-ink/55">
          Customer phone number and owner access are required.
        </p>
      ) : null}
      {message ? <p className="text-xs text-ink/65">{message}</p> : null}
    </div>
  );
}
