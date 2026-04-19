import { signOutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export default function SuspendedPage() {
  return (
    <main className="page-shell">
      <section className="surface-panel mx-auto max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-khata">
          Store suspended
        </p>
        <h1 className="mt-3 font-serif text-3xl text-ink">Access is temporarily disabled</h1>
        <p className="mt-3 text-sm text-ink/70">
          This store has been suspended by the Baaki platform team. Contact support or the store
          owner for help.
        </p>
        <form action={signOutAction} className="mt-6">
          <SubmitButton
            idle="Sign out"
            pending="Signing out..."
            className="button-secondary"
          />
        </form>
      </section>
    </main>
  );
}
