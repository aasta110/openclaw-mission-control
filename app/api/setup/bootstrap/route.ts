import { NextRequest, NextResponse } from 'next/server';
import { createTask, updateTask, seedAgents } from '@/lib/local-storage';
import { readAppState, writeAppState } from '@/lib/app-state';
import { getTier, clampAiCount } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Predefined worker role templates (fixed, not free-form)
const ROLE_TEMPLATES: Array<{ key: string; title: string; description: string; tags: string[] }> = [
  {
    key: 'market',
    title: 'Market research',
    description: 'Find competitors, pricing, positioning, and a clear one-paragraph recommendation.',
    tags: ['role:market-research'],
  },
  {
    key: 'branding',
    title: 'Branding & copy',
    description: 'Name ideas, tagline, tone of voice, and homepage copy outline in plain language.',
    tags: ['role:branding-copy'],
  },
  {
    key: 'design',
    title: 'Web design',
    description: 'Propose a simple site structure + key screens. Focus on consumer-friendly UX.',
    tags: ['role:web-design'],
  },
  {
    key: 'frontend',
    title: 'Frontend code',
    description: 'Outline UI components and a practical implementation plan. Keep it incremental.',
    tags: ['role:frontend'],
  },
  {
    key: 'backend',
    title: 'Backend / payments',
    description: 'Propose backend architecture + payments integration plan (Stripe), without exposing keys.',
    tags: ['role:backend-payments'],
  },
  {
    key: 'seo',
    title: 'SEO',
    description: 'On-page SEO plan: keywords, page titles, metadata, and technical checklist.',
    tags: ['role:seo'],
  },
  {
    key: 'qa',
    title: 'QA / critic',
    description: 'Find risks, missing pieces, and propose test checklist + acceptance criteria.',
    tags: ['role:qa-critic'],
  },
];

function workerId(n: number) {
  // We keep agent ids stable (worker1..worker11) so they are visible in Mission Control.
  return `worker${n}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userName = String(body.userName || '').trim();
    const assistantName = String(body.assistantName || '').trim();
    const projectIdea = String(body.projectIdea || '').trim();
    const tierId = String(body.tierId || 'free');

    // total AIs including Leader
    const requestedTotalAis = Number(body.totalAis || 1);
    const tier = getTier(tierId);
    const totalAis = clampAiCount(requestedTotalAis, tier);

    // Ensure agents.json exists + seeded
    await seedAgents();

    // Create parent mission (Leader-owned)
    const parent = await createTask({
      title: projectIdea ? `Project: ${projectIdea}` : 'New project',
      description: [
        userName ? `User: ${userName}` : '',
        assistantName ? `Leader name: ${assistantName}` : '',
        projectIdea ? `Goal: ${projectIdea}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      priority: 'high',
      assignee: 'leader' as any,
      createdBy: 'leader',
      tags: ['project', 'leader'],
    });

    // Move parent to TODO immediately (so it feels alive)
    await updateTask(parent.id, { status: 'todo' as any });

    // Create worker subtasks up to (totalAis - 1)
    const workerCount = Math.max(0, totalAis - 1);

    for (let i = 0; i < workerCount; i++) {
      const template = ROLE_TEMPLATES[i % ROLE_TEMPLATES.length];
      const wid = workerId(i + 1);

      const t = await createTask({
        title: template.title,
        description: [
          `Project: ${projectIdea || 'Unknown'}`,
          '',
          template.description,
          '',
          'Write in non-technical language. Provide concise bullet deliverables.',
        ].join('\n'),
        priority: 'high',
        assignee: wid as any,
        createdBy: 'leader',
        parentId: parent.id,
        tags: ['worker', ...template.tags],
      });

      // Put child tasks into TODO (dispatcher will pick them up)
      await updateTask(t.id, { status: 'todo' as any });
    }

    const next = await writeAppState({
      onboarded: true,
      userName: userName || undefined,
      assistantName: assistantName || undefined,
      projectIdea: projectIdea || undefined,
      tierId: tier.id,
      totalAis,
      locked: false,
      lockReason: undefined,
      lastBootstrapAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, parentTaskId: parent.id, state: next });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Bootstrap failed' },
      { status: 500 },
    );
  }
}
