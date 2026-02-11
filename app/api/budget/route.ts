import { NextRequest, NextResponse } from 'next/server';
import { getBudget, initBudget, lockBudget, unlockBudget, reserveEur, commitReservation, releaseReservation } from '@/lib/budget';

export const dynamic = 'force-dynamic';

// GET /api/budget
export async function GET() {
  try {
    const budget = await getBudget();
    return NextResponse.json({ success: true, budget });
  } catch (e) {
    console.error('GET /api/budget failed', e);
    return NextResponse.json({ success: false, error: 'Failed to load budget' }, { status: 500 });
  }
}

// POST /api/budget
// Body supports:
// { action:'init', tier, eurCap }
// { action:'lock', note }
// { action:'unlock', note }
// { action:'reserve', eur, note, meta }
// { action:'commit', reservationId, eur, note, meta }
// { action:'release', reservationId, note }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || '');

    if (action === 'init') {
      const budget = await initBudget({ tier: body.tier, eurCap: body.eurCap });
      return NextResponse.json({ success: true, budget });
    }

    if (action === 'lock') {
      const budget = await lockBudget(body?.note);
      return NextResponse.json({ success: true, budget });
    }

    if (action === 'unlock') {
      const budget = await unlockBudget(body?.note);
      return NextResponse.json({ success: true, budget });
    }

    if (action === 'reserve') {
      const r = await reserveEur(body?.eur, body?.note, body?.meta);
      if (!r.ok) {
        return NextResponse.json({ success: false, error: r.error, budget: r.budget }, { status: 402 });
      }
      return NextResponse.json({ success: true, reservationId: r.reservationId, budget: r.budget });
    }

    if (action === 'commit') {
      const budget = await commitReservation(body?.reservationId, body?.eur, body?.note, body?.meta);
      return NextResponse.json({ success: true, budget });
    }

    if (action === 'release') {
      const budget = await releaseReservation(body?.reservationId, body?.note);
      return NextResponse.json({ success: true, budget });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('POST /api/budget failed', e);
    return NextResponse.json({ success: false, error: 'Failed to update budget' }, { status: 500 });
  }
}
