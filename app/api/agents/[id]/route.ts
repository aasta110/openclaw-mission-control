import { NextRequest, NextResponse } from 'next/server';
import { getAgent, updateAgent, serializeAgent } from '@/lib/local-storage';
import { AgentId, AgentStatus, AGENTS } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function resolveAgentId(params: unknown): Promise<string> {
  const p: any = typeof (params as any)?.then === 'function' ? await (params as any) : params;
  const raw = p?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return String(id || '');
}

function isValidAgentId(id: string): id is AgentId {
  return AGENTS.some((a) => a.id === id);
}

// GET /api/agents/[id] - Get agent details
export async function GET(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const agentId = await resolveAgentId(params);
    if (!isValidAgentId(agentId)) {
      return NextResponse.json(
        { success: false, error: `Invalid agent ID: ${agentId}` },
        { status: 400 }
      );
    }

    const agent = await getAgent(agentId);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: serializeAgent(agent),
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id] - Update agent status/lastSeen
export async function PATCH(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const agentId = await resolveAgentId(params);
    if (!isValidAgentId(agentId)) {
      return NextResponse.json(
        { success: false, error: `Invalid agent ID: ${agentId}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, currentTask } = body;

    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'working', 'idle', 'offline'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const updateData: Partial<{
      status: AgentStatus;
      currentTask: string | null;
    }> = {};

    if (status !== undefined) updateData.status = status;
    if (currentTask !== undefined) updateData.currentTask = currentTask;

    const agent = await updateAgent(agentId, updateData);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: serializeAgent(agent),
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}
