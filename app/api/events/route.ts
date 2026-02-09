import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, listEvents, MissionEvent } from '@/lib/event-store';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/events?limit=200
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || '200');
  const events = await listEvents(Number.isFinite(limit) ? Math.max(1, Math.min(1000, limit)) : 200);
  return NextResponse.json({ success: true, events, count: events.length });
}

// POST /api/events (UI/system events)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const evt: MissionEvent = {
      id: uuidv4(),
      ts: new Date().toISOString(),
      source: body.source || 'ui',
      type: body.type || 'task.updated',
      agentId: body.agentId,
      taskId: body.taskId,
      parentId: body.parentId,
      message: body.message || '',
      data: body.data,
    };
    await appendEvent(evt);
    return NextResponse.json({ success: true, event: evt }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/events failed', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to append event',
        detail: String(err?.message || err),
        cwd: process.cwd(),
        node: process.version,
      },
      { status: 500 },
    );
  }
}
