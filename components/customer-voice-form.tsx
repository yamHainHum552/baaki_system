"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import type { CustomerDuplicateMatch } from "@/lib/customer-duplicates";
import { parseSingleVoiceCustomer } from "@/lib/customer-voice-parser";
import { enqueueOfflineItem, OFFLINE_STORES, readOfflineQueue, removeOfflineItem } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";

type RecognitionWindow = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

type VoiceField = "name" | "phone" | "address" | "full";
type QueuedCustomer = {
  name: string;
  phone: string;
  address: string;
};

interface CustomerVoiceFormProps {
  onSaved?: () => void;
  compact?: boolean;
}

export function CustomerVoiceForm({
  onSaved,
}: CustomerVoiceFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [duplicates, setDuplicates] = useState<CustomerDuplicateMatch[]>([]);
  const [listeningField, setListeningField] = useState<VoiceField | null>(null);
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  const canSave = useMemo(() => name.trim().length > 0 && !saving, [name, saving]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    void syncQueuedCustomers(router, setMessage, setIsSyncing, pushToast);

    function onOnline() {
      setIsOnline(true);
      void syncQueuedCustomers(router, setMessage, setIsSyncing, pushToast);
    }

    function onOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [pushToast, router]);

  useEffect(() => {
    const query = phone.trim() || name.trim();

    if (query.length < 3 || !isOnline) {
      setDuplicates([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          name,
          phone,
          address,
        });
        const response = await fetch(`/api/customers/duplicates?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          return;
        }

        setDuplicates((data.matches ?? []).slice(0, 3));
      } catch {
        // Duplicate detection is advisory and should not block normal saving.
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [address, isOnline, name, phone]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = { name, phone, address };

    if (!navigator.onLine) {
      await enqueueOfflineItem(OFFLINE_STORES.customers, payload);
      setName("");
      setPhone("");
      setAddress("");
      setDuplicates([]);
      setMessage("Offline now. Customer queued and will sync when internet returns.");
      setSaving(false);
      pushToast({
        title: "Customer saved offline",
        description: "This customer will sync when internet returns.",
        tone: "info",
      });
      return;
    }

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      const errorMessage = data.error ?? "Unable to save customer.";
      setMessage(errorMessage);
      pushToast({
        title: "Could not save customer",
        description: errorMessage,
        tone: "error",
      });
      return;
    }

    setName("");
    setPhone("");
    setAddress("");
    setDuplicates([]);
    setMessage("Customer saved.");
    pushToast({
      title: "Customer added",
      description: `${name.trim()} has been added to this store.`,
      tone: "success",
    });
    router.refresh();
    onSaved?.();
  }

  function handleVoiceStart(field: VoiceField) {
    const recognitionWindow = window as RecognitionWindow;
    const Recognition =
      recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setMessage("Voice input is not supported on this device.");
      pushToast({
        title: "Voice unavailable",
        description: "Voice input is not supported on this device.",
        tone: "error",
      });
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-NP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningField(field);
      setMessage(
        field === "full"
          ? "Listening for name, number, and address..."
          : `Listening for ${field}...`,
      );
    };

    recognition.onend = () => {
      setListeningField(null);
    };

    recognition.onerror = () => {
      setListeningField(null);
      setMessage("Could not capture voice. Please try again.");
      pushToast({
        title: "Voice capture failed",
        description: "Could not capture voice. Please try again.",
        tone: "error",
      });
    };

    recognition.onresult = (event: any) => {
      const spoken = String(event.results?.[0]?.[0]?.transcript ?? "").trim();

      if (field === "full") {
        const parsed = parseSingleVoiceCustomer(spoken);

        if (parsed.name) {
          setName(parsed.name);
        }

        if (parsed.phone) {
          setPhone(parsed.phone);
        }

        if (parsed.address) {
          setAddress(parsed.address);
        }

        setMessage(
          parsed.name
            ? "Customer details captured. Check the fields and save."
            : "Voice captured. Add the customer name before saving.",
        );
        return;
      }

      if (field === "name") {
        setName(spoken);
      }

      if (field === "phone") {
        setPhone(spoken.replace(/[^\d+]/g, ""));
      }

      if (field === "address") {
        setAddress(spoken);
      }

      setMessage(`${field} captured. Check and save.`);
    };

    recognition.start();
  }

  return (
    <div className="compact-section-spacing">
      <form onSubmit={handleSubmit} className="compact-section-spacing">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-ink/70">
            Speak all details once, or fill fields separately.
          </p>
          <button
            type="button"
            onClick={() => handleVoiceStart("full")}
            disabled={listeningField === "full"}
            className="button-secondary inline-flex w-full items-center justify-center gap-2 px-3 py-2 sm:w-auto"
            aria-label="Voice input for full customer details"
          >
            {micIcon()}
            {listeningField === "full" ? "Listening..." : "Single voice"}
          </button>
        </div>

        <div className="stack-grid sm:grid-cols-2">
          <div className="field-stack">
            <label className="text-sm font-medium text-ink">Customer name</label>
            <div className="relative">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Hari Dai"
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => handleVoiceStart("name")}
                disabled={listeningField === "name"}
                className={cn(
                  "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-white",
                  listeningField === "name" ? "opacity-70" : "",
                )}
                aria-label="Voice input for customer name"
              >
                {micIcon()}
              </button>
            </div>
          </div>

          <div className="field-stack">
            <label className="text-sm font-medium text-ink">Phone</label>
            <div className="relative">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="98XXXXXXXX"
                inputMode="tel"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => handleVoiceStart("phone")}
                disabled={listeningField === "phone"}
                className={cn(
                  "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-white",
                  listeningField === "phone" ? "opacity-70" : "",
                )}
                aria-label="Voice input for customer phone"
              >
                {micIcon()}
              </button>
            </div>
          </div>
        </div>

        <div className="field-stack">
          <label className="text-sm font-medium text-ink">Address</label>
          <div className="relative">
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              placeholder="Tole / house name"
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => handleVoiceStart("address")}
              disabled={listeningField === "address"}
              className={cn(
                "absolute right-2 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-white",
                listeningField === "address" ? "opacity-70" : "",
              )}
              aria-label="Voice input for customer address"
            >
              {micIcon()}
            </button>
          </div>
        </div>

        {message ? (
          <p className="rounded-2xl bg-paper px-3 py-2 text-sm text-ink/75">
            {message}
          </p>
        ) : null}

        {duplicates.length ? (
          <div className="rounded-2xl border border-khata/25 bg-khata/5 px-3 py-2 text-sm text-ink/75">
            <p className="font-semibold text-ink">Possible duplicate</p>
            <div className="mt-1 space-y-1">
              {duplicates.map((customer) => (
                <p key={customer.customer_id} className="truncate text-xs text-ink/65">
                  {customer.customer_name}
                  {[customer.phone, customer.address].filter(Boolean).length
                    ? ` - ${[customer.phone, customer.address].filter(Boolean).join(" | ")}`
                    : ""}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSave}
          className="button-primary w-full sm:w-auto"
        >
          {saving ? "Saving..." : isOnline ? "Save customer" : "Queue customer"}
        </button>
        {!isOnline || isSyncing ? (
          <p className="text-xs text-ink/55">
            {isOnline ? "Syncing queued customers..." : "Offline mode active."}
          </p>
        ) : null}
      </form>
    </div>
  );
}

async function syncQueuedCustomers(
  router: ReturnType<typeof useRouter>,
  setMessage: (message: string) => void,
  setIsSyncing: (value: boolean) => void,
  pushToast: (input: { title?: string; description: string; tone?: "success" | "error" | "info"; durationMs?: number }) => void,
) {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  let queued: Array<{ key: IDBValidKey; customer: QueuedCustomer }> = [];

  try {
    queued = (await readOfflineQueue<QueuedCustomer>(OFFLINE_STORES.customers)).map((queuedItem) => ({
      key: queuedItem.key,
      customer: queuedItem.item,
    }));
  } catch {
    return;
  }

  if (!queued.length) {
    return;
  }

  setIsSyncing(true);
  let syncedCount = 0;

  for (const item of queued) {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item.customer),
    });

    if (response.ok) {
      await removeOfflineItem(OFFLINE_STORES.customers, item.key);
      syncedCount += 1;
    }
  }

  setIsSyncing(false);
  setMessage(
    syncedCount === queued.length
      ? "Offline customers synced."
      : syncedCount > 0
        ? `${syncedCount} queued customer${syncedCount === 1 ? "" : "s"} synced.`
        : "Queued customers are still waiting to sync.",
  );
  pushToast({
    title: syncedCount > 0 ? "Customer sync complete" : "Customer queue pending",
    description:
      syncedCount === queued.length
        ? "All queued customers are now synced."
        : syncedCount > 0
          ? `${syncedCount} queued customer${syncedCount === 1 ? "" : "s"} synced.`
          : "Queued customers are still waiting to sync.",
    tone: syncedCount > 0 ? "success" : "info",
  });
  router.refresh();
}

function micIcon() {
  return (
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
        d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm0 13v5m-5-5a5 5 0 0010 0"
      />
    </svg>
  );
}
