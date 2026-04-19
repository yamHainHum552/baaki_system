import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

type PasskeyChallengeFlow = "registration" | "authentication";

type PasskeyChallengePayload = {
  challenge: string;
  expiresAt: number;
  flow: PasskeyChallengeFlow;
  userId: string | null;
};

const PASSKEY_CHALLENGE_TTL_MS = 1000 * 60 * 5;

function getChallengeSecret() {
  const secret = process.env.WEBAUTHN_CHALLENGE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("WEBAUTHN_CHALLENGE_SECRET or SUPABASE_SERVICE_ROLE_KEY is required for passkey security.");
  }

  return secret;
}

function getCookieName(flow: PasskeyChallengeFlow) {
  return flow === "registration" ? "baaki_passkey_registration" : "baaki_passkey_authentication";
}

function encodePayload(payload: PasskeyChallengePayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signValue(value: string) {
  return createHmac("sha256", getChallengeSecret()).update(value).digest("base64url");
}

function buildCookieValue(payload: PasskeyChallengePayload) {
  const encoded = encodePayload(payload);
  return `${encoded}.${signValue(encoded)}`;
}

function parseCookieValue(value: string | undefined, flow: PasskeyChallengeFlow) {
  if (!value) {
    throw new Error("Passkey challenge is missing. Start again.");
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Passkey challenge is invalid. Start again.");
  }

  const expectedSignature = signValue(encodedPayload);

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new Error("Passkey challenge could not be trusted. Start again.");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as PasskeyChallengePayload;

  if (payload.flow !== flow) {
    throw new Error("Passkey challenge flow does not match. Start again.");
  }

  if (payload.expiresAt < Date.now()) {
    throw new Error("Passkey challenge expired. Please try again.");
  }

  return payload;
}

export function setPasskeyChallengeCookie(
  response: NextResponse,
  params: { challenge: string; flow: PasskeyChallengeFlow; userId: string | null },
) {
  const payload: PasskeyChallengePayload = {
    challenge: params.challenge,
    expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
    flow: params.flow,
    userId: params.userId,
  };

  response.cookies.set(getCookieName(params.flow), buildCookieValue(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(PASSKEY_CHALLENGE_TTL_MS / 1000),
  });
}

export function readPasskeyChallengeCookie(
  request: NextRequest,
  params: { flow: PasskeyChallengeFlow; userId?: string },
) {
  const cookieValue = request.cookies.get(getCookieName(params.flow))?.value;
  const payload = parseCookieValue(cookieValue, params.flow);

  if (params.userId && payload.userId !== params.userId) {
    throw new Error("Passkey challenge does not belong to this account.");
  }

  return payload.challenge;
}

export function clearPasskeyChallengeCookie(response: NextResponse, flow: PasskeyChallengeFlow) {
  response.cookies.set(getCookieName(flow), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
