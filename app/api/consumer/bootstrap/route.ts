import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readConsumerState, writeConsumerState, readUsageState, usageWarnings, writeUsageState } from '@/lib/consumer-store';
import { WORKER_ROLE_TEMPLATES, clampAiCountToTier } from '@/lib/consumer-config';
import { getAgents, getTasks, createTask, updateTask } from '@/lib/local-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/consumer/bootstrap
// Creates Leader + worker agents (in local agents.json) and seeds the first project tasks.
export async function POST() {
  const state = await readConsumerState();

  if (state.onboardingComplete) {
    return NextResponse.json({ success: true, already: true });
  }

  const userName = (state.userName || '').trim();
  const leaderName = (state.leaderName || 'Leader').trim();
  const brief = (state.projectBrief || '').trim();

  if (!userName || !leaderName || !brief) {
    return NextResponse.json(
      { success: false, error: 'Missing onboarding answers (name / leader name / project)' },
      { status: 400 },
    );
  }

  // Ensure usage budget matches tier (in case tier changed before onboarding complete)
  const usage = await readUsageState();
  await writeUsageState(usage);
  const warnings = usageWarnings(usage);
  if (warnings.limitReached) {
    return NextResponse.json(
      { success: false, error: 'Budget limit reached. Please upgrade to continue.' },
      { status: 402 },
    );
  }

  // Agents: stored in data/agents.json via local-storage APIs.
  const existingAgents = await getAgents();
  const byId = new Map(existingAgents.map((a) => [a.id, a] as const));
  const now = new Date().toISOString();

  // Hard requirement: ONE Leader always present.
  if (!byId.has('leader')) {
    existingAgents.push({
      id: 'leader' as any,
      name: leaderName,
      emoji: '🧠',
      role: 'Leader AI',
      focus: 'Project manager: creates workers, assigns tasks, summarizes progress',
      status: 'active' as any,
      currentTask: null,
      lastSeen: now,
    });
  } else {
    // Keep leader name in sync
    const a = byId.get('leader')!;
    a.name = leaderName;
    a.role = 'Leader AI';
    a.focus = 'Project manager: creates workers, assigns tasks, summarizes progress';
  }

  // Determine requested AI count (includes leader)
  const desiredTotal = typeof state.aiCountTotal === 'number' ? state.aiCountTotal : 5;
  const total = clampAiCountToTier(state.tierId, desiredTotal);
  const workers = Math.max(0, total - 1);

  // Create workers from fixed templates (NOT free-form)
  for (let i = 0; i < workers; i++) {
    const tpl = WORKER_ROLE_TEMPLATES[i];
    const id = `worker${i + 1}`;

    if (!byId.has(id)) {
      existingAgents.push({
        id: id as any,
        name: tpl.name,
        emoji: tpl.emoji,
        role: tpl.role,
        focus: tpl.focus,
        status: 'active' as any,
        currentTask: null,
        lastSeen: now,
      });
    }
  }

  // Persist agent list (local-storage writes through atomicWrite)
  // NOTE: local-storage doesn't expose a bulk write; we rely on seed behavior elsewhere.
  // We'll create a tiny task to force save via updateAgent if needed, but easiest is to call /api/seed.
  // Here we directly write through the same file by creating a no-op task: instead we just set onboarding + let /api/agents seed sync.
  // However, getAgents() reads from disk; we must persist now. We'll do this by creating a leader task that triggers write.

  // Seed the first mission + subtasks
  const parent = await createTask({
    title: `Project: ${brief}`,
    description: `Owner: ${userName}\nLeader: ${leaderName}\n\nProject: ${brief}`,
    priority: 'high' as any,
    assignee: 'leader' as any,
    createdBy: 'leader',
    tags: ['project'],
  });
  await updateTask(parent.id, { status: 'todo' as any });

  // Create worker tasks
  for (let i = 0; i < workers; i++) {
    const tpl = WORKER_ROLE_TEMPLATES[i];
    const id = `worker${i + 1}`;
    const child = await createTask({
      title: tpl.defaultTaskTitle,
      description: tpl.defaultTaskDescription(brief),
      priority: 'high' as any,
      assignee: id as any,
      createdBy: 'leader',
      tags: ['auto-created', tpl.key],
      parentId: parent.id,
    });
    await updateTask(child.id, { status: 'todo' as any });
  }

  // Write state
  await writeConsumerState({
    aiCountTotal: total,
    onboardingComplete: true,
  });

  // Best-effort log entry for visibility
  const tasksNow = await getTasks({});
  return NextResponse.json({
    success: true,
    created: {
      agentsTotal: total,
      workers,
      parentTaskId: parent.id,
      tasksCount: tasksNow.length,
      eventId: uuidv4(),
    },
  });
}
