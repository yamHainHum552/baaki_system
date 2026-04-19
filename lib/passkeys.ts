import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AuthLikeUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
  } | null;
};

export type UserPasskey = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name: string | null;
  transports: AuthenticatorTransportFuture[];
  credential_device_type: "singleDevice" | "multiDevice";
  credential_backed_up: boolean;
  last_used_at: string | null;
  created_at: string;
};

export function getPasskeyConfig() {
  const fallbackOrigin = process.env.WEBAUTHN_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const origin = new URL(fallbackOrigin);

  return {
    origin: origin.origin,
    rpID: process.env.WEBAUTHN_RP_ID ?? origin.hostname,
    rpName: process.env.WEBAUTHN_RP_NAME ?? "Baaki",
  };
}

export async function listUserPasskeys(userId: string) {
  const adminClient = createAdminClient();
  return listPasskeysWithClient(adminClient, userId);
}

export async function listVisibleUserPasskeys(userId: string) {
  const supabase = await createClient();
  return listPasskeysWithClient(supabase, userId);
}

export async function createPasskeyRegistrationOptions(user: AuthLikeUser) {
  if (!user.email) {
    throw new Error("A verified email is required before enabling passkeys.");
  }

  const config = getPasskeyConfig();
  let existingPasskeys: UserPasskey[] = [];

  try {
    existingPasskeys = await listUserPasskeys(user.id);
  } catch (error) {
    if (!isPasskeySchemaMissing(normalizePasskeyError(error))) {
      throw error;
    }
  }

  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userName: user.email,
    userDisplayName: user.user_metadata?.full_name?.trim() || user.email,
    userID: new TextEncoder().encode(user.id),
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: passkey.credential_id,
      transports: passkey.transports,
    })),
  });

  return { options };
}

export async function verifyPasskeyRegistration(params: {
  user: AuthLikeUser;
  expectedChallenge: string;
  response: RegistrationResponseJSON;
  deviceName?: string;
}) {
  const { user, expectedChallenge, response, deviceName } = params;
  const config = getPasskeyConfig();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey registration could not be verified.");
  }

  const credential = verification.registrationInfo.credential;
  const adminClient = createAdminClient();
  const label = deviceName?.trim() || derivePasskeyLabel(verification.registrationInfo.credentialDeviceType);

  const { error } = await adminClient.from("user_passkeys").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    device_name: label,
    transports: response.response.transports ?? [],
    credential_device_type: verification.registrationInfo.credentialDeviceType,
    credential_backed_up: verification.registrationInfo.credentialBackedUp,
    last_used_at: null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("This passkey is already registered to your account.");
    }

    throw new Error(error.message);
  }

  return {
    deviceName: label,
  };
}

export async function createPasskeyAuthenticationOptions() {
  const config = getPasskeyConfig();
  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    userVerification: "required",
    timeout: 60000,
  });

  return { options };
}

export async function verifyPasskeyAuthentication(params: {
  expectedChallenge: string;
  response: AuthenticationResponseJSON;
}) {
  const { expectedChallenge, response } = params;
  const passkey = await getPasskeyByCredentialId(response.id);
  const config = getPasskeyConfig();

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
    credential: {
      id: passkey.credential_id,
      publicKey: isoBase64URL.toBuffer(passkey.public_key),
      counter: Number(passkey.counter ?? 0),
      transports: passkey.transports,
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new Error("Passkey authentication could not be verified.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("user_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      credential_device_type: verification.authenticationInfo.credentialDeviceType,
      credential_backed_up: verification.authenticationInfo.credentialBackedUp,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", passkey.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    userId: passkey.user_id,
  };
}

export async function createPasskeyLoginToken(userId: string) {
  const adminClient = createAdminClient();
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);

  if (userError || !userData.user?.email) {
    throw new Error(userError?.message ?? "Unable to find the user for this passkey.");
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
    options: {
      redirectTo: `${getPasskeyConfig().origin}/`,
    },
  });

  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? "Unable to create a secure sign-in token.");
  }

  return {
    email: userData.user.email,
    tokenHash: data.properties.hashed_token,
  };
}

export async function deleteUserPasskey(userId: string, passkeyId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("user_passkeys")
    .delete()
    .eq("id", passkeyId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Passkey not found.");
  }
}

function normalizePasskeys(rows: any[]): UserPasskey[] {
  return rows.map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    credential_id: String(row.credential_id),
    public_key: String(row.public_key),
    counter: Number(row.counter ?? 0),
    device_name: row.device_name ?? null,
    transports: normalizeTransports(row.transports),
    credential_device_type: (row.credential_device_type ?? "singleDevice") as "singleDevice" | "multiDevice",
    credential_backed_up: Boolean(row.credential_backed_up),
    last_used_at: row.last_used_at ?? null,
    created_at: String(row.created_at),
  }));
}

function normalizeTransports(value: unknown): AuthenticatorTransportFuture[] {
  const allowed = new Set<AuthenticatorTransportFuture>([
    "ble",
    "cable",
    "hybrid",
    "internal",
    "nfc",
    "smart-card",
    "usb",
  ]);

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AuthenticatorTransportFuture =>
    typeof item === "string" && allowed.has(item as AuthenticatorTransportFuture),
  );
}

async function listPasskeysWithClient(client: any, userId: string) {
  const { data, error } = await client
    .from("user_passkeys")
    .select(
      "id, user_id, credential_id, public_key, counter, device_name, transports, credential_device_type, credential_backed_up, last_used_at, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isPasskeySchemaMissing(error)) {
      return [];
    }

    throw new Error(error.message);
  }

  return normalizePasskeys(data ?? []);
}

async function getPasskeyByCredentialId(credentialId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("user_passkeys")
    .select(
      "id, user_id, credential_id, public_key, counter, device_name, transports, credential_device_type, credential_backed_up, last_used_at, created_at",
    )
    .eq("credential_id", credentialId)
    .maybeSingle();

  if (error) {
    if (isPasskeySchemaMissing(error)) {
      throw new Error("Passkey setup is not ready yet. Run the latest Supabase schema update first.");
    }

    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Passkey was not recognized.");
  }

  return normalizePasskeys([data])[0];
}

function derivePasskeyLabel(deviceType: "singleDevice" | "multiDevice") {
  return deviceType === "multiDevice" ? "Synced passkey" : "This device";
}

function isPasskeySchemaMissing(error: { message?: string; code?: string | null }) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "PGRST205" ||
    message.includes("public.user_passkeys") ||
    message.includes("schema cache")
  );
}

function normalizePasskeyError(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as { message?: string; code?: string | null };
    return {
      message: record.message,
      code: record.code ?? null,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
    code: null,
  };
}
