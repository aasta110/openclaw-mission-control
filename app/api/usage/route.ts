import { NextRequest, NextResponse } from 'next/server';
import { getUsageSummary, chargeUsage, readAppState } from '@/lib/app-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const usage = await getUsageSummary();
  return NextResponse.json({ success: true, usage });
}

// Internal charging endpoint (used by dispatcher / server actions)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amountEur = Number(body.amountEur);
    const reason = String(body.reason || 'usage');

    if (!Number.isFinite(amountEur) || amountEur <= 0) {
      return NextResponse.json({ success: false, error: 'amountEur must be > 0' }, { status: 400 });
    }

    const s = await readAppState();
    if (s.locked) {
      return NextResponse.json({ success: false, error: 'locked', locked: true }, { status: 423 });
    }

    const out = await chargeUsage({ amountEur, reason });
    return NextResponse.json({ success: true, usage: out.summary });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'charge failed' }, { status: 500 });
  }
}
