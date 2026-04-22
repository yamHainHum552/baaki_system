"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { enqueueOfflineItem, OFFLINE_STORES, readOfflineQueue, removeOfflineItem } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "C"];

type Mode = "baaki" | "payment";

type QueueEntry = {
  customer_id: string;
  type: "BAAKI" | "PAYMENT";
  amount: number;
  description: string;
  created_at: string;
};

export function QuickEntryForm({
  customerId,
  mode: initialMode,
}: {
  customerId: string;
  mode: Mode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [message, setMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [listeningDescription, setListeningDescription] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    void syncQueuedEntries(router, setMessage, setIsSyncing, pushToast);

    function onOnline() {
      setIsOnline(true);
      void syncQueuedEntries(router, setMessage, setIsSyncing, pushToast);
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

  const type = useMemo<QueueEntry["type"]>(
    () => (mode === "baaki" ? "BAAKI" : "PAYMENT"),
    [mode],
  );

  function updateMode(nextMode: Mode) {
    if (nextMode === mode) {
      return;
    }

    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function appendKey(value: string) {
    setAmount((current) => {
      if (value === "C") {
        return "";
      }

      return `${current}${value}`;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload: QueueEntry = {
      customer_id: customerId,
      type,
      amount: Number(amount),
      description,
      created_at: new Date(`${entryDate}T12:00:00`).toISOString(),
    };

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      setMessage("Enter a valid amount.");
      pushToast({
        title: "Invalid amount",
        description: "Enter a valid amount before saving.",
        tone: "error",
      });
      setIsSubmitting(false);
      return;
    }

    if (!navigator.onLine) {
      await enqueueOfflineItem(OFFLINE_STORES.ledger, payload);
      setMessage(
        "Offline now. Entry saved in queue and will sync when internet returns.",
      );
      pushToast({
        title: "Saved offline",
        description: "This entry is queued and will sync when internet returns.",
        tone: "info",
      });
      setAmount("");
      setDescription("");
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const nextMessage = data.error ?? "Unable to save entry.";
        setMessage(nextMessage);
        pushToast({
          title: "Save failed",
          description: nextMessage,
          tone: "error",
        });
        return;
      }

      setAmount("");
      setDescription("");
      setMessage(`${type === "BAAKI" ? "Baaki" : "Payment"} saved.`);
      pushToast({
        title: type === "BAAKI" ? "Baaki saved" : "Payment saved",
        description: "The ledger has been updated.",
        tone: "success",
      });
      router.refresh();
    } catch {
      setMessage("Network error while saving the entry.");
      pushToast({
        title: "Save failed",
        description: "Network error while saving the entry.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function startDescriptionVoiceInput() {
    const voiceWindow = window as typeof window & {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };
    const SpeechRecognition =
      voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("Voice input is not supported on this device.");
      pushToast({
        title: "Voice unavailable",
        description: "Voice input is not supported on this device.",
        tone: "error",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ne-NP";
    recognition.onstart = () => {
      setListeningDescription(true);
      setMessage("Listening for description...");
    };
    recognition.onend = () => {
      setListeningDescription(false);
    };
    recognition.onerror = () => {
      setListeningDescription(false);
      setMessage("Could not capture description. Please try again.");
      pushToast({
        title: "Voice capture failed",
        description: "Could not capture description. Please try again.",
        tone: "error",
      });
    };
    recognition.onresult = (voiceEvent: any) => {
      const transcript = String(voiceEvent.results?.[0]?.[0]?.transcript ?? "");
      setDescription(transcript);
      setMessage(`Description captured: ${transcript}`);
    };
    recognition.start();
  }

  return (
    <div className="section-spacing">
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => updateMode("baaki")}
          className={cn(
            "rounded-3xl px-3 py-3 text-center text-sm font-semibold transition sm:px-5 sm:py-4 sm:text-base",
            mode === "baaki"
              ? "bg-khata text-white shadow-sm"
              : "border border-line bg-paper text-ink hover:bg-white",
          )}
        >
          Add Baaki
        </button>
        <button
          type="button"
          onClick={() => updateMode("payment")}
          className={cn(
            "rounded-3xl px-3 py-3 text-center text-sm font-semibold transition sm:px-5 sm:py-4 sm:text-base",
            mode === "payment"
              ? "bg-moss text-white shadow-sm"
              : "border border-line bg-paper text-ink hover:bg-white",
          )}
        >
          Add Payment
        </button>
      </div>

      <form onSubmit={handleSubmit} className="section-spacing">
        <div className="field-stack">
          <label className="mb-2 block text-sm font-medium text-ink">
            Amount
          </label>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            placeholder="500"
            required
          />
        </div>

        <div className="soft-panel p-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold text-ink">Quick keypad</p>
            <p className="text-[11px] text-ink/60">
              Tap to enter amount faster on phone and tablet.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => appendKey(key)}
                disabled={isSubmitting}
                className="rounded-2xl border border-line bg-paper px-3 py-2.5 text-base font-semibold text-ink transition hover:bg-white sm:px-4 sm:py-3 sm:text-lg"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="field-stack">
          <label className="mb-2 block text-sm font-medium text-ink">
            Description
          </label>
          <div className="relative">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={mode === "baaki" ? "Milk, Rice, Biscuit" : "Paid cash"}
              className="pr-12"
            />
            <button
              type="button"
              onClick={startDescriptionVoiceInput}
              disabled={listeningDescription || isSubmitting}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-white disabled:opacity-60"
              aria-label="Voice input for description"
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
                  d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm0 13v5m-5-5a5 5 0 0010 0"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="field-stack">
          <label className="mb-2 block text-sm font-medium text-ink">
            Date
          </label>
          <input
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            type="date"
            required
          />
        </div>

        <div className="sticky bottom-20 z-20 grid gap-2 rounded-[24px] border border-line/80 bg-warm/95 p-2 shadow-ledger backdrop-blur sm:static sm:grid-cols-2 sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "rounded-3xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-70 sm:px-5 sm:py-3",
              mode === "baaki"
                ? "bg-khata hover:bg-khata/90"
                : "bg-moss hover:bg-moss/90",
            )}
          >
            {isSubmitting
              ? mode === "baaki"
                ? "Saving baaki..."
                : "Saving payment..."
              : mode === "baaki"
                ? "Save baaki"
                : "Save payment"}
          </button>
          <div className="soft-panel flex items-center justify-center px-3 py-2.5 text-sm text-ink/65">
            {isOnline ? "Online" : "Offline"}
            {isSyncing ? " - syncing queued entries" : ""}
          </div>
        </div>

        {message ? (
          <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink/75">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

async function syncQueuedEntries(
  router: ReturnType<typeof useRouter>,
  setMessage: (message: string) => void,
  setIsSyncing: (value: boolean) => void,
  pushToast: (input: { title?: string; description: string; tone?: "success" | "error" | "info"; durationMs?: number }) => void,
) {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  let queued: Array<{ key: IDBValidKey; entry: QueueEntry }> = [];

  try {
    queued = (await readOfflineQueue<QueueEntry>(OFFLINE_STORES.ledger)).map((queuedItem) => ({
      key: queuedItem.key,
      entry: queuedItem.item,
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
    const response = await fetch("/api/ledger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item.entry),
    });

    if (response.ok) {
      await removeOfflineItem(OFFLINE_STORES.ledger, item.key);
      syncedCount += 1;
    }
  }

  setIsSyncing(false);
  setMessage(
    syncedCount === queued.length
      ? "Offline entries synced."
      : syncedCount > 0
        ? `${syncedCount} offline entr${syncedCount === 1 ? "y" : "ies"} synced.`
        : "Queued entries are still waiting to sync.",
  );
  pushToast({
    title: syncedCount > 0 ? "Offline sync complete" : "Offline queue pending",
    description:
      syncedCount === queued.length
        ? "All queued entries are now synced."
        : syncedCount > 0
          ? `${syncedCount} queued entr${syncedCount === 1 ? "y" : "ies"} synced.`
          : "Queued entries are still waiting to sync.",
    tone: syncedCount > 0 ? "success" : "info",
  });
  router.refresh();
}
