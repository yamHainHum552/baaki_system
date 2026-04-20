export type BillingErrorCode =
  | "PAYMENT_INIT_FAILED"
  | "PAYMENT_VERIFICATION_FAILED"
  | "PAYMENT_ALREADY_PROCESSED"
  | "BILLING_PERMISSION_DENIED"
  | "INVALID_PROVIDER_CALLBACK"
  | "UNSUPPORTED_PROVIDER"
  | "UNSUPPORTED_PLAN"
  | "BILLING_NOT_CONFIGURED"
  | "PAYMENT_NOT_FOUND";

export class BillingError extends Error {
  code: BillingErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: BillingErrorCode,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toBillingErrorPayload(error: unknown) {
  if (error instanceof BillingError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        code: error.code,
        details: error.details ?? null,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: error instanceof Error ? error.message : "Unexpected billing error.",
      code: "PAYMENT_INIT_FAILED" as BillingErrorCode,
      details: null,
    },
  };
}
