import { NextRequest, NextResponse } from 'next/server';
import { addUsageEur, usageWarnings } from '@/lib/consumer-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/usage/add { eur: number }
// NOTE: This is called by server-side dispatchers/integrations. Do NOT expose to untrusted networks.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eur = typeof body.eur === 'number' ? body.eur : 0;
    const usage = await addUsageEur(eur);
    const warnings = usageWarnings(usage);
    return NextResponse.json({ success: true, usage, warnings });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to add usage' }, { status: 500 });
  }
}
