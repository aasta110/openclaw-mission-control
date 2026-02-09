import { promises as fs } from 'fs';
import * as path from 'path';

export type EventSource = 'openclaw' | 'ui' | 'system';
export type EventType =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.ordered'
  | 'task.run'
  | 'openclaw.event'
  | 'error';

export interface MissionEvent {
  id: string;
  ts: string; // ISO
  source: EventSource;
  type: EventType;
  agentId?: string;
  taskId?: string;
  parentId?: string;
  message: string;
  data?: Record<string, unknown>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');

type GlobalWithEvents = typeof globalThis & {
  __missionControlEvents?: MissionEvent[];
};

function mem(): MissionEvent[] {
  const g = globalThis as GlobalWithEvents;
  if (!g.__missionControlEvents) g.__missionControlEvents = [];
  return g.__missionControlEvents;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function appendEvent(evt: MissionEvent): Promise<void> {
  // Always keep an in-memory log so the UI works even if disk writes fail.
  mem().push(evt);
  // Keep memory bounded.
  if (mem().length > 5000) mem().splice(0, mem().length - 5000);

  // Best-effort persistence to disk.
  try {
    await ensureDataDir();
    await fs.appendFile(EVENTS_FILE, JSON.stringify(evt) + '\n', 'utf-8');
  } catch (err) {
    // Don't throw: UI should still work.
    console.error('appendEvent disk write failed:', err);
  }
}

export async function listEvents(limit = 200): Promise<MissionEvent[]> {
  // Prefer memory (fast + always available)
  const m = mem();

  // Also attempt to merge in persisted events (best-effort)
  let disk: MissionEvent[] = [];
  try {
    await ensureDataDir();
    const content = await fs.readFile(EVENTS_FILE, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const slice = lines.slice(Math.max(0, lines.length - limit));
    disk = slice
      .map((l) => {
        try {
          return JSON.parse(l) as MissionEvent;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as MissionEvent[];
  } catch {
    // ignore
  }

  // De-dup by id, keep newest last for stable slicing
  const byId = new Map<string, MissionEvent>();
  for (const e of [...disk, ...m]) byId.set(e.id, e);
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );

  return merged.slice(Math.max(0, merged.length - limit));
}
