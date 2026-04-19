import { NextRequest, NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { clearPasskeyChallengeCookie, readPasskeyChallengeCookie } from "@/lib/passkey-challenge";
import { createPasskeyLoginToken, verifyPasskeyAuthentication } from "@/lib/passkeys";
import { createRouteHandlerClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      response?: AuthenticationResponseJSON;
    };

    if (!body.response) {
      return NextResponse.json({ error: "Passkey authentication payload is incomplete." }, { status: 400 });
    }

    const expectedChallenge = readPasskeyChallengeCookie(request, {
      flow: "authentication",
    });

    const verification = await verifyPasskeyAuthentication({
      expectedChallenge,
      response: body.response,
    });

    const loginToken = await createPasskeyLoginToken(verification.userId);
    const response = NextResponse.json({
      ok: true,
      redirectTo: "/",
    });
    const supabase = createRouteHandlerClient(request, response);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: loginToken.tokenHash,
      type: "magiclink",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    clearPasskeyChallengeCookie(response, "authentication");

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in with this passkey.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
