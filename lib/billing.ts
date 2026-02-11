export type TierId = 'free' | 'pro' | 'plus' | 'max';

export type Tier = {
  id: TierId;
  name: string;
  // Max total AIs including Leader
  maxAis: number;
  // Monthly budget in EUR
  monthlyBudgetEur: number;
};

// NOTE: Consumer-facing constraints:
// - No model selection exposed in UI.
// - Budgets are enforced by the system.
export const TIERS: Tier[] = [
  { id: 'free', name: 'Free', maxAis: 2, monthlyBudgetEur: 2.5 },
  { id: 'pro', name: 'Pro', maxAis: 7, monthlyBudgetEur: 12.5 },
  // Higher tiers mentioned in spec: €50 / €80 budgets.
  // We name them generically here; Stripe product naming can map later.
  { id: 'plus', name: 'Plus', maxAis: 12, monthlyBudgetEur: 50 },
  { id: 'max', name: 'Max', maxAis: 12, monthlyBudgetEur: 80 },
];

export function getTier(id: string | undefined | null): Tier {
  const found = TIERS.find((t) => t.id === id);
  return found || TIERS[0];
}

export function clampAiCount(requestedTotalAis: number, tier: Tier): number {
  // Must always include Leader (1)
  const min = 1;
  const max = tier.maxAis;
  return Math.max(min, Math.min(max, requestedTotalAis));
}

export function dailyRecommendedEur(tier: Tier): number {
  // Simple heuristic (30-day month)
  return tier.monthlyBudgetEur / 30;
}
