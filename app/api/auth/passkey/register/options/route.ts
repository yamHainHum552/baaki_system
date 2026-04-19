import { NextRequest, NextResponse } from "next/server";
import { setPasskeyChallengeCookie } from "@/lib/passkey-challenge";
import { createPasskeyRegistrationOptions } from "@/lib/passkeys";
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
    const data = await createPasskeyRegistrationOptions(user);
    const response = NextResponse.json(data);

    setPasskeyChallengeCookie(response, {
      challenge: data.options.challenge,
      flow: "registration",
      userId: user.id,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start passkey registration.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
