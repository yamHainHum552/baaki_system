"use client";

import { useState } from "react";
import { useToast } from "@/components/toast-provider";

type BillingPlanView = {
  planType: "premium_monthly" | "premium_yearly";
  label: string;
  billingCycle: "monthly" | "yearly";
  amountMinor: number;
  currency: string;
  isLive: boolean;
  featuresSummary: string[];
};

export function StoreBillingPanel({
  plans,
  providerAvailability,
}: {
  plans: BillingPlanView[];
  providerAvailability: Record<"khalti" | "esewa", boolean>;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const { pushToast } = useToast();
  const primaryPlan = plans.find((plan) => plan.planType === "premium_yearly") ?? plans[0];

  async function startCheckout(provider: "khalti" | "esewa", planType: BillingPlanView["planType"]) {
    const key = `${provider}:${planType}`;
    setPendingKey(key);

    try {
      const response = await fetch("/api/billing/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          planType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to start billing.");
      }

      const checkout = data.checkout as
        | { kind: "redirect"; url: string }
        | { kind: "form"; actionUrl: string; method: "POST"; fields: Record<string, string> };

      if (checkout.kind === "redirect") {
        window.location.href = checkout.url;
        return;
      }

      const form = document.createElement("form");
      form.method = checkout.method;
      form.action = checkout.actionUrl;
      form.style.display = "none";

      Object.entries(checkout.fields).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      pushToast({
        title: "Billing unavailable",
        description: error instanceof Error ? error.message : "Unable to start the payment flow.",
        tone: "error",
      });
      setPendingKey(null);
    }
  }

  return (
    <div className="surface-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-khata">Premium billing</p>
          <h3 className="mt-2 font-serif text-2xl text-ink">Upgrade with local payment</h3>
          <p className="mt-2 max-w-2xl text-sm text-ink/70">
            Choose a yearly Premium plan and pay with Khalti or eSewa. Your subscription is activated only after the payment is verified on the backend.
          </p>
        </div>
        <div className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-moss">
          Yearly live now
        </div>
      </div>

      {primaryPlan ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-line bg-paper/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  {primaryPlan.billingCycle}
                </p>
                <h4 className="mt-2 text-xl font-semibold text-ink">{primaryPlan.label}</h4>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-khata">
                  NPR {Math.round(primaryPlan.amountMinor / 100).toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-xs text-ink/55">Billed once for 12 months</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {primaryPlan.featuresSummary.map((feature) => (
                <div key={feature} className="soft-panel px-3.5 py-3 text-sm text-ink/75">
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-line bg-white/65 p-4">
            <p className="text-sm font-semibold text-ink">Choose payment provider</p>
            <p className="mt-1 text-sm text-ink/65">
              The plan turns active only after verified payment.
            </p>

            <div className="mt-4 grid gap-3">
              <ProviderButton
                label="Pay with Khalti"
                description="Fast redirect checkout with verified confirmation."
                disabled={!providerAvailability.khalti}
                pending={pendingKey === `khalti:${primaryPlan.planType}`}
                onClick={() => startCheckout("khalti", primaryPlan.planType)}
              />
              <ProviderButton
                label="Pay with eSewa"
                description="Official eSewa form flow with backend status verification."
                disabled={!providerAvailability.esewa}
                pending={pendingKey === `esewa:${primaryPlan.planType}`}
                onClick={() => startCheckout("esewa", primaryPlan.planType)}
              />
            </div>

            <div className="mt-4 rounded-[22px] border border-dashed border-line bg-paper/70 px-4 py-3">
              <p className="text-sm font-semibold text-ink">Monthly plan</p>
              <p className="mt-1 text-sm text-ink/60">
                The monthly structure is ready, but yearly is the live billing option for now.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProviderButton({
  label,
  description,
  disabled,
  pending,
  onClick,
}: {
  label: string;
  description: string;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="rounded-[22px] border border-line bg-paper px-4 py-4 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{pending ? "Starting payment..." : label}</p>
          <p className="mt-1 text-sm text-ink/60">
            {disabled ? "Provider is not configured yet." : description}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-khata">
          {disabled ? "Disabled" : pending ? "Please wait" : "Continue"}
        </span>
      </div>
    </button>
  );
}
