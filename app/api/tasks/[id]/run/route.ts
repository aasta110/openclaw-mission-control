import { NextRequest, NextResponse } from 'next/server';
import { addComment, getTasks, updateTask } from '@/lib/local-storage';

export const dynamic = 'force-dynamic';

async function resolveId(params: unknown): Promise<string> {
  const p: any = typeof (params as any)?.then === 'function' ? await (params as any) : params;
  const raw = p?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return String(id || '');
}

// POST /api/tasks/[id]/run
// Starts a parent task by moving its children from BACKLOG -> TODO.
export async function POST(request: NextRequest, { params }: { params: any }) {
  try {
    const parentId = await resolveId(params);
    if (!parentId) {
      return NextResponse.json({ success: false, error: 'Missing task id' }, { status: 400 });
    }

    const all = await getTasks();
    const parent = all.find((t) => t.id === parentId);
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const children = all.filter((t) => t.parentId === parentId);

    let moved = 0;
    for (const c of children) {
      if (c.status === 'backlog') {
        await updateTask(c.id, { status: 'todo' });
        moved++;
      }
    }

    // Also move parent into TODO if it is still in backlog.
    if (parent.status === 'backlog') {
      await updateTask(parentId, { status: 'todo' });
    }

    await addComment(parentId, 'main', `Run invoked: moved ${moved}/${children.length} subtasks to TODO.`);

    return NextResponse.json({
      success: true,
      parentId,
      moved,
      totalChildren: children.length,
    });
  } catch (err) {
    console.error('Run failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to run task' }, { status: 500 });
  }
}
