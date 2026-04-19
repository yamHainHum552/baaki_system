import { NextRequest, NextResponse } from "next/server";
import { listVisibleUserPasskeys } from "@/lib/passkeys";
import { createRouteHandlerClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in first." }, { status: 401 });
  }

  try {
    const passkeys = await listVisibleUserPasskeys(user.id);
    return NextResponse.json({ passkeys });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load passkeys.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
