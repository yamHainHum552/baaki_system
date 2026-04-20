import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signInAction } from "@/app/actions";
import { AuthFormShell } from "@/components/auth-form-shell";
import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspaceStateIfSignedIn } from "@/lib/auth";

const PasskeySignInButton = dynamic(
  () => import("@/components/passkey-sign-in-button").then((mod) => mod.PasskeySignInButton),
  { loading: () => <div className="button-secondary w-full text-center">Loading biometric sign-in...</div> },
);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  await searchParams;
  const session = await getWorkspaceStateIfSignedIn();

  if (session) {
    redirect(session.context ? "/dashboard" : "/setup");
  }

  return (
    <main className="page-shell items-center justify-center">
      <div className="w-full max-w-md rounded-[32px] border border-line bg-warm p-6 shadow-ledger">
        <BrandLogo markSize={52} />
        <h1 className="mt-4 font-serif text-3xl text-ink">Digital khata for your shop</h1>
        <p className="mt-2 text-sm text-ink/70">
          Record baaki and payments just like the red notebook on your counter.
        </p>

        <AuthFormShell action={signInAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Email</label>
            <input
              name="email"
              type="email"
              placeholder="shop@example.com"
              autoComplete="email webauthn"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Password</label>
            <input
              name="password"
              type="password"
              placeholder="........"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton
            idle="Open khata"
            pending="Opening..."
            className="button-primary w-full text-base"
          />
        </AuthFormShell>

        <div className="mt-5">
          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-warm px-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Or
              </span>
            </div>
          </div>
          <PasskeySignInButton />
          <p className="mt-3 text-xs text-ink/55">
            After your first sign-in, open Account to enable fingerprint, Face ID, or Windows Hello.
          </p>
        </div>

        <p className="mt-5 text-sm text-ink/70">
          New store?{" "}
          <Link href="/signup" className="font-semibold text-khata">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
