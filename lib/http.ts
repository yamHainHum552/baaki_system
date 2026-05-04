export function parseJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  return value as Record<string, unknown>;
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  options?: { min?: number; max?: number },
) {
  const parsed = Number(value ?? fallback);
  const min = options?.min ?? 1;
  const max = options?.max ?? 100;

  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function contentDisposition(disposition: "attachment" | "inline", filename: string) {
  const safeFilename = filename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "export";

  return `${disposition}; filename="${safeFilename}"`;
}
