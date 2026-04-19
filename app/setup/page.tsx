import { createStoreAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspaceStateForUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SetupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; welcome?: string }>;
}) {
  const { context } = await getWorkspaceStateForUser();
  const params = await searchParams;

  if (context) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell items-center justify-center">
      <div className="w-full max-w-lg rounded-[32px] border border-line bg-warm p-6 shadow-ledger">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-khata">Store Setup</p>
        <h1 className="mt-3 font-serif text-3xl text-ink">Write your shop name first</h1>
        <p className="mt-2 text-sm text-ink/70">
          This keeps every shop&apos;s khata separate. You can add customers right after this.
        </p>
        <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm text-ink/65">
          If someone is adding you as staff, you do not need to create a store. Once they add your account, sign in again and you&apos;ll land in their store workspace automatically.
        </p>

        <form
          action={createStoreAction}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Store name</label>
            <input
              name="name"
              placeholder="Shrestha Kirana Pasal"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Phone</label>
            <input
              name="phone"
              placeholder="98XXXXXXXX"
            />
          </div>

          <SubmitButton
            idle="Start my khata"
            pending="Starting..."
            className="button-primary w-full text-base"
          />
        </form>
      </div>
    </main>
  );
}
