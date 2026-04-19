"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";

export function PasskeySignInButton() {
  const { pushToast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handlePasskeySignIn() {
    if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
      pushToast({
        tone: "error",
        description: "This browser does not support passkey sign-in.",
      });
      return;
    }

    setIsSigningIn(true);

    try {
      const optionsResponse = await fetch("/api/auth/passkey/auth/options", {
        method: "POST",
      });
      const optionsPayload = await optionsResponse.json();

      if (!optionsResponse.ok) {
        throw new Error(optionsPayload.error ?? "Unable to start passkey sign-in.");
      }

      const authenticationResponse = await startAuthentication({
        optionsJSON: optionsPayload.options,
      });

      const verifyResponse = await fetch("/api/auth/passkey/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: authenticationResponse,
        }),
      });
      const verifyPayload = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyPayload.error ?? "Unable to sign in with this passkey.");
      }

      window.location.assign(verifyPayload.redirectTo ?? "/");
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Passkey sign-in failed",
        description:
          error instanceof Error ? error.message : "Unable to sign in with a passkey.",
      });
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePasskeySignIn}
      className="button-secondary w-full text-base"
      disabled={isSigningIn}
      aria-busy={isSigningIn}
    >
      {isSigningIn ? "Checking passkey..." : "Use fingerprint or face ID"}
    </button>
  );
}
