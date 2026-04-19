"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

type RecognitionWindow = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

interface CustomerVoiceFormProps {
  onSaved?: () => void;
  compact?: boolean;
}

export function CustomerVoiceForm({
  onSaved,
  compact = false,
}: CustomerVoiceFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [listeningField, setListeningField] = useState<"name" | "phone" | "address" | null>(null);
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  const canSave = useMemo(() => name.trim().length > 0 && !saving, [name, saving]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        address,
      }),
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
    setTranscript("");
    setMessage("Customer saved.");
    pushToast({
      title: "Customer added",
      description: `${name.trim()} has been added to this store.`,
      tone: "success",
    });
    router.refresh();
    onSaved?.();
  }

  function handleVoiceStart(field: "name" | "phone" | "address") {
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
      setMessage(`Listening for ${field}...`);
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
      setTranscript(spoken);

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
    <div className="section-spacing">
      <form onSubmit={handleSubmit} className="section-spacing">
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
              rows={3}
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

        <div className={cn("soft-panel px-4 py-3", compact ? "text-sm" : "text-sm")}>
          <p className="font-medium text-ink">
            Fill each field by typing or tapping its voice icon.
          </p>
          <p className="mt-1 text-ink/65">
            {transcript
              ? `Last heard: ${transcript}`
              : "Voice works best when you speak one field at a time."}
          </p>
        </div>

        {message ? (
          <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink/75">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSave}
          className="button-primary w-full sm:w-auto"
        >
          {saving ? "Saving..." : "Save customer"}
        </button>
      </form>
    </div>
  );
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
