export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type RiskIndicator = {
  score: number;
  level: RiskLevel;
};

export function calculateRiskIndicator(input: {
  daysSinceLastPayment: number | null;
  totalBaaki: number;
  threshold: number;
}): RiskIndicator {
  const threshold = Math.max(input.threshold || 1000, 1);
  const score = (input.daysSinceLastPayment ?? 45) + input.totalBaaki / threshold;

  if (score >= 45) {
    return { score, level: "HIGH" };
  }

  if (score >= 20) {
    return { score, level: "MEDIUM" };
  }

  return { score, level: "LOW" };
}

export function riskClasses(level: RiskLevel) {
  switch (level) {
    case "HIGH":
      return "bg-khata/10 text-khata border-khata/30";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border-amber-300";
    default:
      return "bg-moss/10 text-moss border-moss/30";
  }
}
