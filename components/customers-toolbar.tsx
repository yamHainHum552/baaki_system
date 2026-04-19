"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CustomerVoiceForm } from "@/components/customer-voice-form";

type RecognitionWindow = typeof window & {
  SpeechRecognition?: new () => {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: any) => void) | null;
    start: () => void;
  };
  webkitSpeechRecognition?: new () => {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: any) => void) | null;
    start: () => void;
  };
};

export function CustomersToolbar({
  initialQuery,
  isOwner,
}: {
  initialQuery: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [searchMessage, setSearchMessage] = useState("");
  const [searchListening, setSearchListening] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const nextQuery = query.trim();
    const currentQuery = searchParams.get("q") ?? "";

    if (nextQuery === currentQuery) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, {
        scroll: false,
      });
    });
  }, [pathname, query, router, searchParams]);

  function startVoiceSearch() {
    const recognitionWindow = window as RecognitionWindow;
    const Recognition =
      recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSearchMessage("Voice search is not supported on this device.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-NP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setSearchListening(true);
      setSearchMessage("Listening for customer search...");
    };

    recognition.onend = () => {
      setSearchListening(false);
    };

    recognition.onerror = () => {
      setSearchListening(false);
      setSearchMessage("Could not capture voice search. Please try again.");
    };

    recognition.onresult = (event) => {
      const spoken = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      setQuery(spoken);
      setSearchMessage(`Showing results for "${spoken}".`);
    };

    recognition.start();
  }

  return (
    <>
      <div className="mt-3 grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (searchMessage) {
                setSearchMessage("");
              }
            }}
            placeholder="Search by name, phone, address, due, or risk"
            className="pr-12"
          />
          <button
            type="button"
            onClick={startVoiceSearch}
            disabled={searchListening}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-white disabled:opacity-60"
            aria-label="Voice search customers"
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

        {isOwner ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="button-primary w-full lg:w-auto"
          >
            Add customer
          </button>
        ) : null}
      </div>

      {searchMessage ? <p className="mt-3 text-sm text-ink/65">{searchMessage}</p> : null}

      {isOwner && isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-line bg-paper p-4 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata">
                  Add customer
                </p>
                <h2 className="mt-2 font-serif text-xl text-ink sm:text-2xl">
                  New customer khata
                </h2>
                <p className="mt-2 text-sm text-ink/65">
                  Speak or type the details, then save once.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition hover:bg-white"
                aria-label="Close add customer modal"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-5 max-h-[75vh] overflow-y-auto pr-1">
              <CustomerVoiceForm
                compact
                onSaved={() => {
                  setIsModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
