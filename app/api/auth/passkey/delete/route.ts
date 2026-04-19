import { NextRequest, NextResponse } from "next/server";
import { deleteUserPasskey } from "@/lib/passkeys";
import { createRouteHandlerClient } from "@/lib/supabase/route";

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in before removing a passkey." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      passkeyId?: string;
    };

    if (!body.passkeyId) {
      return NextResponse.json({ error: "Choose a passkey to remove." }, { status: 400 });
    }

    await deleteUserPasskey(user.id, body.passkeyId);

    return NextResponse.json({
      ok: true,
      message: "Passkey removed.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove this passkey.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
