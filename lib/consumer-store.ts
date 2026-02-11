import { promises as fs } from 'fs';
import path from 'path';
import { TierId, TIERS, dailyRecommendedEur } from './consumer-config';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONSUMER_FILE = path.join(DATA_DIR, 'consumer.json');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');

export type ConsumerState = {
  onboardingComplete: boolean;
  createdAt: string; // ISO

  // Tier/billing state (billing is handled elsewhere; we store the active tier for enforcement)
  tierId: TierId;

  // First-run answers
  userName?: string;
  leaderName?: string;
  projectBrief?: string;

  // AI team
  aiCountTotal?: number; // includes Leader
  autoCreationMode?: 'auto' | 'manual';
};

export type UsageState = {
  monthKey: string; // YYYY-MM
  updatedAt: string; // ISO
  eurUsed: number;
  eurBudget: number;
  todayKey: string; // YYYY-MM-DD
  eurUsedToday: number;
};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function readConsumerState(): Promise<ConsumerState> {
  try {
    const raw = await fs.readFile(CONSUMER_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
    const tierId: TierId = (parsed.tierId as TierId) || 'free';
    return {
      onboardingComplete: Boolean(parsed.onboardingComplete),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      tierId: TIERS[tierId] ? tierId : 'free',
      userName: typeof parsed.userName === 'string' ? parsed.userName : undefined,
      leaderName: typeof parsed.leaderName === 'string' ? parsed.leaderName : undefined,
      projectBrief: typeof parsed.projectBrief === 'string' ? parsed.projectBrief : undefined,
      aiCountTotal: typeof parsed.aiCountTotal === 'number' ? parsed.aiCountTotal : undefined,
      autoCreationMode: parsed.autoCreationMode === 'manual' ? 'manual' : parsed.autoCreationMode === 'auto' ? 'auto' : undefined,
    };
  } catch {
    // Default fresh install state
    return {
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
      tierId: 'free',
    };
  }
}

export async function writeConsumerState(patch: Partial<ConsumerState>): Promise<ConsumerState> {
  const current = await readConsumerState();
  const next: ConsumerState = {
    ...current,
    ...patch,
    tierId: patch.tierId && TIERS[patch.tierId] ? patch.tierId : current.tierId,
  };

  await ensureDir();
  await fs.writeFile(CONSUMER_FILE, JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return next;
}

export async function readUsageState(): Promise<UsageState> {
  const consumer = await readConsumerState();
  const tier = TIERS[consumer.tierId];

  try {
    const raw = await fs.readFile(USAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const mk = monthKey();
    const dk = dayKey();

    // Roll month/day automatically
    const eurBudget = typeof parsed.eurBudget === 'number' ? parsed.eurBudget : tier.budgetEurMonthly;
    const state: UsageState = {
      monthKey: typeof parsed.monthKey === 'string' ? parsed.monthKey : mk,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      eurUsed: typeof parsed.eurUsed === 'number' ? parsed.eurUsed : 0,
      eurBudget,
      todayKey: typeof parsed.todayKey === 'string' ? parsed.todayKey : dk,
      eurUsedToday: typeof parsed.eurUsedToday === 'number' ? parsed.eurUsedToday : 0,
    };

    if (state.monthKey !== mk) {
      state.monthKey = mk;
      state.eurUsed = 0;
    }
    if (state.todayKey !== dk) {
      state.todayKey = dk;
      state.eurUsedToday = 0;
    }

    // Keep budget synced with tier
    state.eurBudget = tier.budgetEurMonthly;

    return state;
  } catch {
    const mk = monthKey();
    const dk = dayKey();
    return {
      monthKey: mk,
      updatedAt: new Date().toISOString(),
      eurUsed: 0,
      eurBudget: tier.budgetEurMonthly,
      todayKey: dk,
      eurUsedToday: 0,
    };
  }
}

export async function writeUsageState(next: UsageState): Promise<void> {
  await ensureDir();
  await fs.writeFile(USAGE_FILE, JSON.stringify(next, null, 2) + '\n', 'utf-8');
}

export async function addUsageEur(amount: number): Promise<UsageState> {
  const u = await readUsageState();
  const inc = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const next: UsageState = {
    ...u,
    updatedAt: new Date().toISOString(),
    eurUsed: u.eurUsed + inc,
    eurUsedToday: u.eurUsedToday + inc,
  };
  await writeUsageState(next);
  return next;
}

export function usageWarnings(u: UsageState) {
  const recommended = dailyRecommendedEur(u.eurBudget);
  const overDaily = u.eurUsedToday > recommended * 1.05; // 5% tolerance

  const remaining = Math.max(0, u.eurBudget - u.eurUsed);
  const pacePerDay = u.eurUsedToday; // simplistic: today represents pace
  const daysLeft = pacePerDay > 0 ? remaining / pacePerDay : Infinity;

  return {
    recommendedDailyEur: recommended,
    overDaily,
    remainingEur: remaining,
    daysUntilLimitAtThisPace: Number.isFinite(daysLeft) ? Math.max(0, Math.floor(daysLeft)) : null,
    percentUsed: u.eurBudget > 0 ? Math.min(100, (u.eurUsed / u.eurBudget) * 100) : 0,
    limitReached: u.eurUsed >= u.eurBudget,
  };
}
