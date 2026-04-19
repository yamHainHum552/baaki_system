"use client";

import type { FeatureName } from "@/lib/entitlements";
import { useStoreClientContext } from "@/components/store-context-provider";

export function useFeatureAccess(featureName: FeatureName) {
  const store = useStoreClientContext();
  const access = store.entitlements.featureAccess[featureName];

  return {
    ...access,
    isPremium: store.entitlements.isPremium,
    planLabel: store.entitlements.displayPlanLabel,
    planStatus: store.entitlements.planStatus,
  };
}
