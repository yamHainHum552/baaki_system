import { NextResponse } from "next/server";
import { setPasskeyChallengeCookie } from "@/lib/passkey-challenge";
import { createPasskeyAuthenticationOptions } from "@/lib/passkeys";

export async function POST() {
  try {
    const data = await createPasskeyAuthenticationOptions();
    const response = NextResponse.json(data);
    setPasskeyChallengeCookie(response, {
      challenge: data.options.challenge,
      flow: "authentication",
      userId: null,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start passkey sign-in.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
