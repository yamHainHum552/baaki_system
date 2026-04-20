import type { BillingCycle, PlanStatus, PlanType } from "@/lib/entitlements";
import { ADToBS } from "bikram-sambat-js";

const englishLocale = "en-US";
const nepaliDisplayTimeZone = "Asia/Kathmandu";
const bsMonthNames = [
  "Baishakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat(englishLocale, {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string) {
  const date = formatBsDate(value);
  return `${date.monthName} ${date.day}`;
}

export function formatLongDate(value: string) {
  const date = formatBsDate(value);
  return `${date.monthName} ${date.day}, ${date.year} BS`;
}

export function formatDays(value: number | null | undefined) {
  if (value == null) {
    return "No payment yet";
  }

  if (value === 0) {
    return "Today";
  }

  if (value === 1) {
    return "1 day";
  }

  return `${formatNumber(value)} days`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(englishLocale, {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPlanLabel(plan: "FREE" | "PREMIUM") {
  return plan === "PREMIUM" ? "Premium" : "Free";
}

export function formatEntitlementPlanLabel(planType: PlanType) {
  if (planType === "premium_monthly") {
    return "Premium Monthly";
  }

  if (planType === "premium_yearly") {
    return "Premium Yearly";
  }

  return "Free";
}

export function formatPlanStatusLabel(planStatus: PlanStatus) {
  if (planStatus === "trialing") {
    return "Trialing";
  }

  if (planStatus === "past_due") {
    return "Past due";
  }

  if (planStatus === "cancelled") {
    return "Cancelled";
  }

  if (planStatus === "inactive") {
    return "Inactive";
  }

  return "Active";
}

export function formatBillingCycleLabel(billingCycle: BillingCycle) {
  if (billingCycle === "monthly") {
    return "Monthly";
  }

  if (billingCycle === "yearly") {
    return "Yearly";
  }

  return "No billing";
}

export function formatUsageLimit(limit: number) {
  return limit >= 1000000 ? "Unlimited" : formatNumber(limit);
}

export function formatTrialCountdown(days: number | null) {
  if (days == null) {
    return "No active trial";
  }

  if (days === 0) {
    return "Trial ends today";
  }

  if (days === 1) {
    return "1 day left in trial";
  }

  return `${formatNumber(days)} days left in trial`;
}

export function parseAmount(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Amount must be greater than 0.");
  }
  return parsed;
}

export function toEntryTimestamp(dateValue: FormDataEntryValue | null) {
  if (typeof dateValue !== "string" || !dateValue) {
    return new Date().toISOString();
  }

  return new Date(`${dateValue}T12:00:00`).toISOString();
}

function formatBsDate(value: string) {
  try {
    const adDateString = toKathmanduDateString(value);
    const [year, month, day] = ADToBS(adDateString)
      .split("-")
      .map((part) => Number(part));

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      month < 1 ||
      month > bsMonthNames.length
    ) {
      throw new Error("Invalid BS date");
    }

    return {
      year,
      month,
      day,
      monthName: bsMonthNames[month - 1],
    };
  } catch {
    const fallbackDate = new Date(value);
    return {
      year: fallbackDate.getUTCFullYear(),
      month: fallbackDate.getUTCMonth() + 1,
      day: fallbackDate.getUTCDate(),
      monthName: new Intl.DateTimeFormat(englishLocale, {
        month: "short",
        timeZone: nepaliDisplayTimeZone,
      }).format(fallbackDate),
    };
  }
}

function toKathmanduDateString(value: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: nepaliDisplayTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to parse date");
  }

  return `${year}-${month}-${day}`;
}
