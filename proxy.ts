import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabase, response } = updateSession(request);

  if (request.nextUrl.pathname.startsWith("/super-admin")) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminUser?.is_active) {
      return NextResponse.redirect(
        new URL("/dashboard?error=Super%20admin%20access%20required", request.url),
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|apple-icon|icon|install-icon-192|install-icon-512).*)",
  ],
};
