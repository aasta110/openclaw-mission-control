import { promises as fs } from 'fs';
import * as path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');

export type TierId = 'free' | 'pro' | 'team' | 'enterprise';

export interface BudgetLedgerEntry {
  id: string;
  kind: 'reserve' | 'commit' | 'release' | 'adjust_cap' | 'lock' | 'unlock';
  eur: number;
  note?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface BudgetState {
  tier: TierId;
  eurCap: number; // hard cap
  eurUsed: number; // committed spend
  eurReserved: number; // in-flight reservations
  locked: boolean; // kill switch
  updatedAt: string;
  ledger: BudgetLedgerEntry[];
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function ensureBudgetFile() {
  await ensureDir();
  try {
    await fs.access(BUDGET_FILE);
  } catch {
    const initial: BudgetState = {
      tier: 'free',
      eurCap: 0,
      eurUsed: 0,
      eurReserved: 0,
      locked: false,
      updatedAt: nowIso(),
      ledger: [],
    };
    await fs.writeFile(BUDGET_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

async function writeBudget(state: BudgetState) {
  await ensureDir();
  state.updatedAt = nowIso();
  const tmp = BUDGET_FILE + '.tmp.' + Date.now();
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf-8');
  // Windows-safe replace
  await fs.copyFile(tmp, BUDGET_FILE);
  await fs.unlink(tmp);
}

export async function getBudget(): Promise<BudgetState> {
  await ensureBudgetFile();
  const raw = await fs.readFile(BUDGET_FILE, 'utf-8');
  try {
    return JSON.parse(raw) as BudgetState;
  } catch {
    // recover
    const recovered: BudgetState = {
      tier: 'free',
      eurCap: 0,
      eurUsed: 0,
      eurReserved: 0,
      locked: false,
      updatedAt: nowIso(),
      ledger: [],
    };
    await writeBudget(recovered);
    return recovered;
  }
}

function ledgerId() {
  return crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
}

export function remainingEur(b: BudgetState) {
  return Math.max(0, b.eurCap - b.eurUsed - b.eurReserved);
}

export async function initBudget(input: { tier: TierId; eurCap: number }): Promise<BudgetState> {
  const b = await getBudget();
  b.tier = input.tier;
  b.eurCap = Math.max(0, Number(input.eurCap || 0));
  b.locked = b.eurCap <= 0 ? true : b.locked;
  b.ledger.push({ id: ledgerId(), kind: 'adjust_cap', eur: b.eurCap, at: nowIso(), note: 'initBudget' });
  await writeBudget(b);
  return b;
}

export async function lockBudget(note?: string) {
  const b = await getBudget();
  b.locked = true;
  b.ledger.push({ id: ledgerId(), kind: 'lock', eur: 0, at: nowIso(), note });
  await writeBudget(b);
  return b;
}

export async function unlockBudget(note?: string) {
  const b = await getBudget();
  b.locked = false;
  b.ledger.push({ id: ledgerId(), kind: 'unlock', eur: 0, at: nowIso(), note });
  await writeBudget(b);
  return b;
}

export async function reserveEur(eur: number, note?: string, meta?: Record<string, unknown>) {
  const b = await getBudget();
  const amt = Math.max(0, Number(eur || 0));

  if (b.locked) {
    return { ok: false as const, error: 'BUDGET_LOCKED', budget: b };
  }

  if (amt <= 0) {
    return { ok: true as const, reservationId: ledgerId(), budget: b };
  }

  const rem = remainingEur(b);
  if (amt > rem) {
    // Hard kill switch when cap is exhausted
    if (b.eurCap - b.eurUsed <= 0) {
      b.locked = true;
      b.ledger.push({ id: ledgerId(), kind: 'lock', eur: 0, at: nowIso(), note: 'Auto-lock: cap exhausted' });
      await writeBudget(b);
    }
    return { ok: false as const, error: 'INSUFFICIENT_BUDGET', budget: b };
  }

  const reservationId = ledgerId();
  b.eurReserved += amt;
  b.ledger.push({ id: reservationId, kind: 'reserve', eur: amt, at: nowIso(), note, meta });
  await writeBudget(b);
  return { ok: true as const, reservationId, budget: b };
}

export async function commitReservation(reservationId: string, actualEur: number, note?: string, meta?: Record<string, unknown>) {
  const b = await getBudget();
  const entry = b.ledger.find((e) => e.id === reservationId && e.kind === 'reserve');
  const reserved = entry ? entry.eur : 0;
  const actual = Math.max(0, Number(actualEur || 0));

  // Release reserved amount then commit actual.
  b.eurReserved = Math.max(0, b.eurReserved - reserved);
  b.eurUsed += actual;

  b.ledger.push({ id: ledgerId(), kind: 'commit', eur: actual, at: nowIso(), note, meta: { reservationId, ...meta } });

  if (b.eurCap - b.eurUsed <= 0) {
    b.locked = true;
    b.ledger.push({ id: ledgerId(), kind: 'lock', eur: 0, at: nowIso(), note: 'Auto-lock: cap exhausted' });
  }

  await writeBudget(b);
  return b;
}

export async function releaseReservation(reservationId: string, note?: string) {
  const b = await getBudget();
  const entry = b.ledger.find((e) => e.id === reservationId && e.kind === 'reserve');
  const reserved = entry ? entry.eur : 0;
  b.eurReserved = Math.max(0, b.eurReserved - reserved);
  b.ledger.push({ id: ledgerId(), kind: 'release', eur: reserved, at: nowIso(), note, meta: { reservationId } });
  await writeBudget(b);
  return b;
}

export function assertBudgetCanSpend(b: BudgetState, estEur: number) {
  if (b.locked) {
    return { ok: false as const, error: 'BUDGET_LOCKED' };
  }
  if (estEur > remainingEur(b)) {
    return { ok: false as const, error: 'INSUFFICIENT_BUDGET' };
  }
  return { ok: true as const };
}
