import { NextRequest, NextResponse } from 'next/server';
import { readConsumerState, writeConsumerState } from '@/lib/consumer-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/consumer
export async function GET() {
  const state = await readConsumerState();
  return NextResponse.json({ success: true, state });
}

// PATCH /api/consumer
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const patch: any = {};

    if (typeof body.tierId === 'string') patch.tierId = body.tierId;
    if (typeof body.userName === 'string') patch.userName = body.userName;
    if (typeof body.leaderName === 'string') patch.leaderName = body.leaderName;
    if (typeof body.projectBrief === 'string') patch.projectBrief = body.projectBrief;
    if (typeof body.aiCountTotal === 'number') patch.aiCountTotal = body.aiCountTotal;
    if (body.autoCreationMode === 'auto' || body.autoCreationMode === 'manual') patch.autoCreationMode = body.autoCreationMode;

    if (typeof body.onboardingComplete === 'boolean') patch.onboardingComplete = body.onboardingComplete;

    const state = await writeConsumerState(patch);
    return NextResponse.json({ success: true, state });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update state' }, { status: 500 });
  }
}
