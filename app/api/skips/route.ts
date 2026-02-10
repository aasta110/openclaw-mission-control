import { NextRequest, NextResponse } from 'next/server';
import { addSkip, listSkips, removeSkip } from '@/lib/skip-store';
import { appendEvent } from '@/lib/event-store';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/skips
export async function GET() {
  const keys = await listSkips();
  return NextResponse.json({ success: true, keys, count: keys.length });
}

// POST /api/skips
// body: { key: string, message?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = String(body?.key || '').trim();
    if (!key) return NextResponse.json({ success: false, error: 'Missing key' }, { status: 400 });

    await addSkip(key);

    // Log for auditability in Activity.
    await appendEvent({
      id: uuidv4(),
      ts: new Date().toISOString(),
      source: 'ui',
      type: 'task.updated',
      message: `Skipped activity item (${key})`,
      data: { key, message: body?.message || null },
    });

    return NextResponse.json({ success: true, key }, { status: 201 });
  } catch (err) {
    console.error('POST /api/skips failed', err);
    return NextResponse.json({ success: false, error: 'Failed to persist skip' }, { status: 500 });
  }
}

// DELETE /api/skips?key=...
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = String(searchParams.get('key') || '').trim();
  if (!key) return NextResponse.json({ success: false, error: 'Missing key' }, { status: 400 });

  await removeSkip(key);
  return NextResponse.json({ success: true, key });
}
