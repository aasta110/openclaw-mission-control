import { NextRequest, NextResponse } from 'next/server';
import { logWork, serializeTask } from '@/lib/local-storage';
import { AgentId } from '@/lib/types';
import { AGENT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function resolveTaskId(params: unknown): Promise<string> {
  const p: any = typeof (params as any)?.then === 'function' ? await (params as any) : params;
  const raw = p?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return String(id || '');
}

// POST /api/tasks/[id]/log - Agent logs work progress
export async function POST(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const body = await request.json();
    const { agent, action, note } = body;

    if (!agent || !action || !note) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: agent, action, note' },
        { status: 400 }
      );
    }

    // Validate agent
    const validAgents = ['shri', 'leo', 'nova', 'pixel', 'cipher', 'echo', 'forge'];
    if (!validAgents.includes(agent)) {
      return NextResponse.json(
        { success: false, error: `Invalid agent. Must be one of: ${validAgents.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['progress', 'blocked'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const task = await logWork(params.id, agent as AgentId, action, note);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: serializeTask(task),
      message: 'Work logged successfully',
    });
  } catch (error) {
    console.error('Error logging work:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log work' },
      { status: 500 }
    );
  }
}
