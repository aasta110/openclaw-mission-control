import { promises as fs } from 'fs';
import path from 'path';
import { readConsumerState } from './consumer-store';
import { WORKER_ROLE_TEMPLATES, clampAiCountToTier } from './consumer-config';

// This bypasses local-storage types to keep seeding simple.
// It writes directly to data/agents.json.

const DATA_DIR = path.join(process.cwd(), 'data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

type AgentStatus = 'active' | 'working' | 'idle' | 'offline';

export type AgentRecord = {
  id: string;
  name: string;
  emoji: string;
  role: string;
  focus: string;
  status: AgentStatus;
  currentTask: string | null;
  lastSeen: string;
};

async function readAgentsFile(): Promise<AgentRecord[]> {
  try {
    const raw = await fs.readFile(AGENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AgentRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAgentsFile(agents: AgentRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2) + '\n', 'utf-8');
}

export async function ensureConsumerAgents(): Promise<AgentRecord[]> {
  const state = await readConsumerState();
  const now = new Date().toISOString();

  const desiredTotal = typeof state.aiCountTotal === 'number' ? state.aiCountTotal : 2;
  const total = clampAiCountToTier(state.tierId, desiredTotal);
  const workers = Math.max(0, total - 1);

  const agents = await readAgentsFile();
  const byId = new Map(agents.map((a) => [a.id, a] as const));

  const leaderName = (state.leaderName || 'Leader').trim();

  if (!byId.has('leader')) {
    agents.push({
      id: 'leader',
      name: leaderName,
      emoji: '🧠',
      role: 'Leader AI',
      focus: 'Project manager: creates workers, assigns tasks, summarizes progress',
      status: 'active',
      currentTask: null,
      lastSeen: now,
    });
  } else {
    const l = byId.get('leader')!;
    l.name = leaderName;
    l.role = 'Leader AI';
    l.focus = 'Project manager: creates workers, assigns tasks, summarizes progress';
  }

  for (let i = 0; i < workers; i++) {
    const tpl = WORKER_ROLE_TEMPLATES[i];
    const id = `worker${i + 1}`;
    if (!byId.has(id)) {
      agents.push({
        id,
        name: tpl.name,
        emoji: tpl.emoji,
        role: tpl.role,
        focus: tpl.focus,
        status: 'active',
        currentTask: null,
        lastSeen: now,
      });
    }
  }

  await writeAgentsFile(agents);
  return agents;
}
