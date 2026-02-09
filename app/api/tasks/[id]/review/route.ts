import { NextRequest, NextResponse } from 'next/server';
import { getTask, getTasks, updateTask, serializeTask } from '@/lib/local-storage';
import { AgentId } from '@/lib/types';
import { appendEvent } from '@/lib/event-store';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveTaskId(params: unknown): Promise<string> {
  const p: any = typeof (params as any)?.then === 'function' ? await (params as any) : params;
  const raw = p?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return String(id || '');
}

// POST /api/tasks/[id]/review
// Body: { reviewer: AgentId, decision: 'approved'|'changes_requested', notes?: string }
export async function POST(request: NextRequest, { params }: { params: any }) {
  try {
    const taskId = await resolveTaskId(params);
    const body = await request.json();
    const reviewer = body.reviewer as AgentId | undefined;
    const decision = body.decision as 'approved' | 'changes_requested' | undefined;
    const notes = typeof body.notes === 'string' ? body.notes : '';

    if (!reviewer) {
      return NextResponse.json({ success: false, error: 'Missing reviewer' }, { status: 400 });
    }
    if (decision !== 'approved' && decision !== 'changes_requested') {
      return NextResponse.json(
        { success: false, error: "Invalid decision (must be 'approved' or 'changes_requested')" },
        { status: 400 },
      );
    }

    const t = await getTask(taskId);
    if (!t) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });

    const updated = await updateTask(taskId, {
      reviewStatus: decision,
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    } as any);

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    await appendEvent({
      id: uuidv4(),
      ts: new Date().toISOString(),
      source: 'ui',
      type: 'task.updated',
      agentId: reviewer,
      taskId,
      parentId: updated.parentId,
      message: `Review ${decision} by ${reviewer}`,
      data: { decision, notes },
    });

    // If this is a child task and it was approved, auto-advance parent to done if all children approved.
    if (decision === 'approved' && updated.parentId) {
      const siblings = await getTasks({});
      const children = siblings.filter((x: any) => x && x.parentId === updated.parentId);
      if (children.length > 0) {
        const allApproved = children.every((c: any) => c.reviewStatus === 'approved');
        if (allApproved) {
          // This will also be validated by updateTask gating.
          await updateTask(updated.parentId, { status: 'done' } as any);
          await appendEvent({
            id: uuidv4(),
            ts: new Date().toISOString(),
            source: 'system',
            type: 'task.updated',
            taskId: updated.parentId,
            message: `Parent mission auto-advanced to DONE (all subtasks approved)`
          });
        }
      }
    }

    return NextResponse.json({ success: true, task: serializeTask(updated) });
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/review failed', err);
    return NextResponse.json(
      { success: false, error: 'Failed to review task', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}
