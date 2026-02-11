import { NextRequest, NextResponse } from 'next/server';
import { appendEvent } from '@/lib/event-store';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /openclaw/event
// Receives OpenClaw hook events and persists them into data/events.jsonl
export async function POST(request: NextRequest) {
  try {
    // Be tolerant: some senders may post plain text or malformed JSON.
    let body: any = null;
    let rawText: string | null = null;

    try {
      body = await request.json();
    } catch {
      try {
        rawText = await request.text();
        // Try one more time if the body is JSON-ish.
        const trimmed = rawText.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          body = JSON.parse(trimmed);
        } else {
          body = { message: trimmed };
        }
      } catch {
        body = { message: 'OpenClaw event (unparseable body)' };
      }
    }

    await appendEvent({
      id: uuidv4(),
      ts: new Date().toISOString(),
      source: 'openclaw',
      type: 'openclaw.event',
      agentId: body?.agentId || body?.agent || body?.assignee,
      taskId: body?.taskId || body?.task?.id,
      parentId: body?.parentId,
      message: body?.message || body?.event || rawText || 'OpenClaw event',
      data: body,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /openclaw/event failed', err);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest event', detail: String((err as any)?.message || err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: true, ok: true });
}
