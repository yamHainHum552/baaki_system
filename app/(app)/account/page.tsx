import dynamic from "next/dynamic";
import { SectionCard } from "@/components/section-card";
import { getUser, requireStoreContext } from "@/lib/auth";
import type { UserPasskey } from "@/lib/passkeys";
import { listVisibleUserPasskeys } from "@/lib/passkeys";

const PasskeySecurityCard = dynamic(
  () => import("@/components/passkey-security-card").then((mod) => mod.PasskeySecurityCard),
  { loading: () => <div className="soft-panel p-4 text-sm text-ink/65">Loading passkey settings...</div> },
);

export default async function AccountPage() {
  const { store } = await requireStoreContext();
  const { user } = await getUser();

  if (!user) {
    return null;
  }

  let passkeys: UserPasskey[] = [];
  let passkeySetupPending = false;

  try {
    passkeys = await listVisibleUserPasskeys(user.id);
  } catch (error) {
    passkeySetupPending =
      error instanceof Error &&
      error.message.toLowerCase().includes("schema update");
  }

  return (
    <div className="section-spacing">
      <SectionCard
        title="Account security"
        subtitle="Manage how you sign in to Baaki across this workspace."
      >
        <div className="grid gap-4 lg:grid-cols-[0.44fr_0.56fr]">
          <div className="soft-panel p-4 sm:p-5">
            <p className="text-sm font-semibold text-ink">Current account</p>
            <div className="mt-3 space-y-2 text-sm text-ink/70">
              <p>
                <span className="font-semibold text-ink">Email:</span> {user.email ?? "No email"}
              </p>
              <p>
                <span className="font-semibold text-ink">Current store:</span> {store.name}
              </p>
              <p>
                <span className="font-semibold text-ink">Role:</span> {store.role}
              </p>
            </div>
          </div>

          <div className="soft-panel p-4 sm:p-5">
            <p className="text-sm font-semibold text-ink">Passkey security</p>
            <p className="mt-2 text-sm text-ink/65">
              Passkeys are phishing-resistant and work with biometrics, PINs, and device security keys.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Passkeys</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{passkeys.length}</p>
              </div>
              <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Biometric login</p>
                <p className="mt-2 text-sm font-semibold text-moss">
                  {passkeys.length > 0 ? "Enabled" : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Protection</p>
                <p className="mt-2 text-sm font-semibold text-ink">User verified</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Passkeys"
        subtitle="Register a device once, then sign in with fingerprint, Face ID, Windows Hello, or a security key."
      >
        {passkeySetupPending ? (
          <div className="mb-4 rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink/70">
            Passkey setup is almost ready. Run the latest `supabase/schema.sql` in Supabase first, then reload this page.
          </div>
        ) : null}
        <PasskeySecurityCard initialPasskeys={passkeys} />
      </SectionCard>
    </div>
  );
}
