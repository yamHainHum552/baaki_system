import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/actions";
import { AuthFormShell } from "@/components/auth-form-shell";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspaceStateIfSignedIn } from "@/lib/auth";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await searchParams;
  const session = await getWorkspaceStateIfSignedIn();

  if (session) {
    redirect(session.context ? "/dashboard" : "/setup");
  }

  return (
    <main className="page-shell items-center justify-center">
      <div className="w-full max-w-md rounded-[32px] border border-line bg-warm p-6 shadow-ledger">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-khata">Baaki</p>
        <h1 className="mt-3 font-serif text-3xl text-ink">Create your shop ledger</h1>
        <p className="mt-2 text-sm text-ink/70">
          Sign up first, then add your store name and start writing baaki.
        </p>

        <AuthFormShell
          action={signUpAction}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Email</label>
            <input
              name="email"
              type="email"
              placeholder="shop@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Password</label>
            <input
              name="password"
              type="password"
              minLength={6}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <SubmitButton
            idle="Create account"
            pending="Creating..."
            className="button-primary w-full text-base"
          />
        </AuthFormShell>

        <p className="mt-5 text-sm text-ink/70">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-khata"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
