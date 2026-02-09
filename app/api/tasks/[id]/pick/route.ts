import { NextRequest, NextResponse } from 'next/server';
import { pickTask, serializeTask } from '@/lib/local-storage';
import { AgentId } from '@/lib/types';
import { AGENT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function resolveTaskId(params: unknown): Promise<string> {
  const p: any = typeof (params as any)?.then === 'function' ? await (params as any) : params;
  const raw = p?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return String(id || '');
}

// POST /api/tasks/[id]/pick - Agent picks up a task
export async function POST(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const body = await request.json();
    const { agent } = body;

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: agent' },
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

    const task = await pickTask(params.id, agent as AgentId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: serializeTask(task),
      message: `Task picked up by ${agent}`,
    });
  } catch (error) {
    console.error('Error picking task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to pick task' },
      { status: 500 }
    );
  }
}
