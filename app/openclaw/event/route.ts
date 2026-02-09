import { NextRequest, NextResponse } from 'next/server';
import { appendEvent } from '@/lib/event-store';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /openclaw/event
// Receives OpenClaw hook events and persists them into data/events.jsonl
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await appendEvent({
      id: uuidv4(),
      ts: new Date().toISOString(),
      source: 'openclaw',
      type: 'openclaw.event',
      agentId: body.agentId || body.agent || body.assignee,
      taskId: body.taskId || body.task?.id,
      parentId: body.parentId,
      message: body.message || body.event || 'OpenClaw event',
      data: body,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /openclaw/event failed', err);
    return NextResponse.json({ success: false, error: 'Failed to ingest event' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, ok: true });
}
