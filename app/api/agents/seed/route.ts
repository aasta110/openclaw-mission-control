import { NextResponse } from 'next/server';
import { ensureConsumerAgents } from '@/lib/seed-consumer-agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/agents/seed
export async function POST() {
  const agents = await ensureConsumerAgents();
  return NextResponse.json({ success: true, agents, count: agents.length });
}
