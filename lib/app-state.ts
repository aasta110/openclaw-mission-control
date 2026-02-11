import { promises as fs } from 'fs';
import path from 'path';
import { TierId, getTier, dailyRecommendedEur } from './billing';

export type AppState = {
  version: number;
  onboarded: boolean;

  // Onboarding answers
  userName?: string;
  assistantName?: string;
  projectIdea?: string;

  // Billing & limits
  tierId: TierId;
  // Total AIs including Leader (1..12)
  totalAis: number;

  // Usage enforcement (EUR)
  monthKey: string; // YYYY-MM
  usedThisMonthEur: number;
  usedTodayEur: number;
  todayKey: string; // YYYY-MM-DD

  locked: boolean;
  lockReason?: string;

  // Cosmetic: when workers were last (re)generated
  lastBootstrapAt?: string;
};

const STATE_PATH = path.join(process.cwd(), 'data', 'app-state.json');

function yyyyMm(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function defaultAppState(): AppState {
  const now = new Date();
  return {
    version: 1,
    onboarded: false,
    tierId: 'free',
    totalAis: 1,
    monthKey: yyyyMm(now),
    usedThisMonthEur: 0,
    todayKey: yyyyMmDd(now),
    usedTodayEur: 0,
    locked: false,
  };
}

export async function readAppState(): Promise<AppState> {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const base = { ...defaultAppState(), ...(parsed || {}) } as AppState;

    // Roll day/month counters forward if needed
    const now = new Date();
    const mk = yyyyMm(now);
    const dk = yyyyMmDd(now);

    if (base.monthKey !== mk) {
      base.monthKey = mk;
      base.usedThisMonthEur = 0;
    }
    if (base.todayKey !== dk) {
      base.todayKey = dk;
      base.usedTodayEur = 0;
    }

    return base;
  } catch {
    return defaultAppState();
  }
}

export async function writeAppState(patch: Partial<AppState>): Promise<AppState> {
  const current = await readAppState();
  const next: AppState = {
    ...current,
    ...patch,
  };

  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return next;
}

export type UsageSummary = {
  tierId: TierId;
  monthlyBudgetEur: number;
  usedThisMonthEur: number;
  remainingThisMonthEur: number;
  pctUsed: number;
  dailyRecommendedEur: number;
  usedTodayEur: number;
  todayVsRecommendedPct: number;
  paceDaysLeftEstimate?: number;
  locked: boolean;
  lockReason?: string;
};

export async function getUsageSummary(): Promise<UsageSummary> {
  const s = await readAppState();
  const tier = getTier(s.tierId);

  const remaining = Math.max(0, tier.monthlyBudgetEur - s.usedThisMonthEur);
  const pctUsed = tier.monthlyBudgetEur > 0 ? (s.usedThisMonthEur / tier.monthlyBudgetEur) * 100 : 0;

  const rec = dailyRecommendedEur(tier);
  const todayPct = rec > 0 ? (s.usedTodayEur / rec) * 100 : 0;

  let paceDaysLeftEstimate: number | undefined = undefined;
  if (s.usedThisMonthEur > 0) {
    // naive: if today pace continues for the month
    const daily = s.usedThisMonthEur / Math.max(1, daysIntoMonth());
    if (daily > 0) paceDaysLeftEstimate = remaining / daily;
  }

  return {
    tierId: tier.id,
    monthlyBudgetEur: tier.monthlyBudgetEur,
    usedThisMonthEur: round2(s.usedThisMonthEur),
    remainingThisMonthEur: round2(remaining),
    pctUsed: round1(pctUsed),
    dailyRecommendedEur: round2(rec),
    usedTodayEur: round2(s.usedTodayEur),
    todayVsRecommendedPct: round1(todayPct),
    paceDaysLeftEstimate: paceDaysLeftEstimate !== undefined ? round1(paceDaysLeftEstimate) : undefined,
    locked: Boolean(s.locked),
    lockReason: s.lockReason,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function daysIntoMonth() {
  const now = new Date();
  return now.getDate();
}

export async function chargeUsage(params: { amountEur: number; reason: string }): Promise<{ state: AppState; summary: UsageSummary }> {
  const s = await readAppState();
  const tier = getTier(s.tierId);

  const amount = Math.max(0, params.amountEur);

  const nextUsedMonth = s.usedThisMonthEur + amount;
  const nextUsedToday = s.usedTodayEur + amount;

  let locked = s.locked;
  let lockReason = s.lockReason;

  if (nextUsedMonth >= tier.monthlyBudgetEur) {
    locked = true;
    lockReason = `Budget limit reached (€${tier.monthlyBudgetEur}).`;
  }

  const next = await writeAppState({
    usedThisMonthEur: nextUsedMonth,
    usedTodayEur: nextUsedToday,
    locked,
    lockReason,
  });

  return { state: next, summary: await getUsageSummary() };
}
