import { promises as fs } from 'fs';
import * as path from 'path';

// Persistent store of "skipped" activity items.
//
// We store *keys* (strings) rather than event ids, so we can skip re-ingested
// OpenClaw messages as well.
//
// Key format:
// - msg:<message_id>  (preferred when available)
// - evt:<event_id>    (fallback)

const DATA_DIR = path.join(process.cwd(), 'data');
const SKIPS_FILE = path.join(DATA_DIR, 'skips.json');

type GlobalWithSkips = typeof globalThis & {
  __missionControlSkips?: Set<string>;
};

function mem(): Set<string> {
  const g = globalThis as GlobalWithSkips;
  if (!g.__missionControlSkips) g.__missionControlSkips = new Set();
  return g.__missionControlSkips;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadDisk(): Promise<string[]> {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(SKIPS_FILE, 'utf-8');
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
    return [];
  } catch {
    return [];
  }
}

async function saveDisk(keys: string[]) {
  await ensureDataDir();
  await fs.writeFile(SKIPS_FILE, JSON.stringify(keys, null, 2) + '\n', 'utf-8');
}

export async function listSkips(): Promise<string[]> {
  // Merge disk -> memory for durability across restarts
  const disk = await loadDisk();
  const m = mem();
  for (const k of disk) m.add(k);
  return Array.from(m.values());
}

export async function addSkip(key: string): Promise<void> {
  if (!key || typeof key !== 'string') return;
  const k = key.trim();
  if (!k) return;

  const m = mem();
  m.add(k);

  // Best-effort persistence
  try {
    const disk = await loadDisk();
    if (!disk.includes(k)) {
      disk.push(k);
      // Keep bounded
      const bounded = disk.slice(Math.max(0, disk.length - 50_000));
      await saveDisk(bounded);
    }
  } catch (err) {
    console.error('addSkip disk write failed:', err);
  }
}

export async function removeSkip(key: string): Promise<void> {
  if (!key || typeof key !== 'string') return;
  const k = key.trim();
  if (!k) return;

  mem().delete(k);
  try {
    const disk = await loadDisk();
    const next = disk.filter((x) => x !== k);
    await saveDisk(next);
  } catch (err) {
    console.error('removeSkip disk write failed:', err);
  }
}
