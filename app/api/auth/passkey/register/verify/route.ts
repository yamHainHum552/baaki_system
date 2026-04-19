import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { clearPasskeyChallengeCookie, readPasskeyChallengeCookie } from "@/lib/passkey-challenge";
import { verifyPasskeyRegistration } from "@/lib/passkeys";
import { createRouteHandlerClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const authResponse = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, authResponse);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in before adding a passkey." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      response?: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!body.response) {
      return NextResponse.json({ error: "Passkey registration payload is incomplete." }, { status: 400 });
    }

    const expectedChallenge = readPasskeyChallengeCookie(request, {
      flow: "registration",
      userId: user.id,
    });

    const result = await verifyPasskeyRegistration({
      user,
      expectedChallenge,
      response: body.response,
      deviceName: body.deviceName,
    });

    const response = NextResponse.json({
      ok: true,
      message: `${result.deviceName} is ready for biometric sign-in.`,
    });

    clearPasskeyChallengeCookie(response, "registration");

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to verify this passkey.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
