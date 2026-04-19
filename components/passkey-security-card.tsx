"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

type PasskeyItem = {
  id: string;
  device_name: string | null;
  credential_device_type: "singleDevice" | "multiDevice";
  credential_backed_up: boolean;
  last_used_at: string | null;
  created_at: string;
};

function formatPasskeyDate(value: string | null) {
  if (!value) {
    return "Never used";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PasskeySecurityCard({
  initialPasskeys,
}: {
  initialPasskeys: PasskeyItem[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [deviceName, setDeviceName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const supportsPasskeys = useMemo(
    () => typeof window !== "undefined" && "PublicKeyCredential" in window,
    [],
  );

  async function handleRegisterPasskey() {
    if (!supportsPasskeys) {
      pushToast({
        tone: "error",
        description: "This browser does not support passkeys.",
      });
      return;
    }

    setIsRegistering(true);

    try {
      const optionsResponse = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
      });
      const optionsPayload = await optionsResponse.json();

      if (!optionsResponse.ok) {
        throw new Error(optionsPayload.error ?? "Unable to start passkey setup.");
      }

      const registrationResponse = await startRegistration({
        optionsJSON: optionsPayload.options,
      });

      const verifyResponse = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: registrationResponse,
          deviceName,
        }),
      });
      const verifyPayload = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyPayload.error ?? "Unable to verify this passkey.");
      }

      await refreshPasskeys();
      setDeviceName("");
      router.refresh();
      pushToast({
        tone: "success",
        title: "Passkey ready",
        description: verifyPayload.message ?? "Biometric sign-in is now enabled on this device.",
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Passkey setup failed",
        description:
          error instanceof Error ? error.message : "Unable to finish passkey setup.",
      });
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleRemovePasskey(passkeyId: string) {
    setRemovingId(passkeyId);

    try {
      const response = await fetch("/api/auth/passkey/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          passkeyId,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove this passkey.");
      }

      setPasskeys((current) => current.filter((item) => item.id !== passkeyId));
      router.refresh();
      pushToast({
        tone: "success",
        description: payload.message ?? "Passkey removed.",
      });
    } catch (error) {
      pushToast({
        tone: "error",
        description:
          error instanceof Error ? error.message : "Unable to remove this passkey.",
      });
    } finally {
      setRemovingId(null);
    }
  }

  async function refreshPasskeys() {
    const response = await fetch("/api/auth/passkey/list", {
      method: "GET",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to refresh passkeys.");
    }

    setPasskeys(payload.passkeys ?? []);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="soft-panel p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink">Add passkey</p>
        <p className="mt-2 text-sm text-ink/65">
          Enable fingerprint, Face ID, Windows Hello, or your device passcode for faster and safer sign-in.
        </p>

        <div className="mt-4 grid gap-3">
          <input
            value={deviceName}
            onChange={(event) => setDeviceName(event.target.value)}
            placeholder="Device name (optional)"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleRegisterPasskey}
            className="button-primary"
            disabled={isRegistering}
            aria-busy={isRegistering}
          >
            {isRegistering ? "Setting up..." : "Add passkey"}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink/65">
          Passkeys stay on your devices and never reveal your fingerprint or face data to Baaki.
        </div>
      </div>

      <div className="space-y-3">
        {passkeys.length === 0 ? (
          <div className="soft-panel p-5 text-sm text-ink/65">
            No passkeys yet. Add one to unlock biometric login on supported devices.
          </div>
        ) : (
          passkeys.map((passkey) => (
            <div key={passkey.id} className="soft-panel p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-ink">
                      {passkey.device_name ?? "Unnamed passkey"}
                    </p>
                    <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/65">
                      {passkey.credential_device_type === "multiDevice" ? "Synced" : "Device"}
                    </span>
                    {passkey.credential_backed_up ? (
                      <span className="rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-moss">
                        Backed up
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-ink/65">
                    Added {formatPasskeyDate(passkey.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-ink/50">
                    Last used {formatPasskeyDate(passkey.last_used_at)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePasskey(passkey.id)}
                  className="button-secondary w-full sm:w-auto"
                  disabled={removingId === passkey.id}
                  aria-busy={removingId === passkey.id}
                >
                  {removingId === passkey.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
