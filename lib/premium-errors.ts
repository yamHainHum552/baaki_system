export type PremiumErrorCode =
  | "FEATURE_LOCKED"
  | "PLAN_LIMIT_REACHED"
  | "TRIAL_EXPIRED"
  | "OWNER_ONLY";

export class PremiumAccessError extends Error {
  code: PremiumErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: PremiumErrorCode,
    message: string,
    status = 403,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PremiumAccessError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toPremiumErrorPayload(error: unknown) {
  if (error instanceof PremiumAccessError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details ?? null,
      status: error.status,
    };
  }

  return {
    error: error instanceof Error ? error.message : "Unknown premium access error.",
    code: "FEATURE_LOCKED" as const,
    details: null,
    status: 400,
  };
}
