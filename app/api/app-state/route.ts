import { NextRequest, NextResponse } from 'next/server';
import { readAppState, writeAppState, getUsageSummary } from '@/lib/app-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readAppState();
  const usage = await getUsageSummary();
  return NextResponse.json({ success: true, state, usage });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    // Only allow patching a small safe subset from the UI.
    const patch: any = {};
    if (typeof body.userName === 'string') patch.userName = body.userName;
    if (typeof body.assistantName === 'string') patch.assistantName = body.assistantName;
    if (typeof body.projectIdea === 'string') patch.projectIdea = body.projectIdea;

    if (typeof body.tierId === 'string') patch.tierId = body.tierId;
    if (typeof body.totalAis === 'number') patch.totalAis = body.totalAis;

    if (typeof body.onboarded === 'boolean') patch.onboarded = body.onboarded;

    const next = await writeAppState(patch);
    const usage = await getUsageSummary();

    return NextResponse.json({ success: true, state: next, usage });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update app state' }, { status: 500 });
  }
}
