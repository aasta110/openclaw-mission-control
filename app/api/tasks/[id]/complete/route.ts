import { NextRequest, NextResponse } from 'next/server';
import { completeTask, serializeTask } from '@/lib/local-storage';
import { AgentId } from '@/lib/types';
import { AGENT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function resolveTaskId(params: unknown): Promise<string> {
  const p: any = typeof (params as any)?.then === 'function' ? await (params as any) : params;
  const raw = p?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return String(id || '');
}

// POST /api/tasks/[id]/complete - Agent marks task as done
export async function POST(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const body = await request.json();
    const { agent, note, deliverable, deliverables } = body;

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: agent' },
        { status: 400 }
      );
    }

    // Validate agent
    const validAgents = AGENT_CONFIG.agents.map((a) => a.id);
    if (!validAgents.includes(String(agent).toLowerCase() as any)) {
      return NextResponse.json(
        { success: false, error: `Invalid agent. Must be one of: ${validAgents.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate deliverable if provided (must be .md file) - backward compatibility
    if (deliverable && typeof deliverable === 'string' && !deliverable.endsWith('.md')) {
      return NextResponse.json(
        { success: false, error: 'Deliverable must be a .md file' },
        { status: 400 }
      );
    }

    // Validate deliverables array if provided (all must be .md files)
    if (deliverables && Array.isArray(deliverables)) {
      for (const d of deliverables) {
        if (typeof d === 'string' && !d.endsWith('.md')) {
          return NextResponse.json(
            { success: false, error: 'All deliverables must be .md files' },
            { status: 400 }
          );
        }
      }
    }

    const task = await completeTask(params.id, agent as AgentId, note, deliverables, deliverable);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: serializeTask(task),
      message: `Task completed by ${agent}`,
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete task' },
      { status: 500 }
    );
  }
}
