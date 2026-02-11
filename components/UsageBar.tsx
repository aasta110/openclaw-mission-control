'use client';

import { useEffect, useState } from 'react';

type Usage = {
  monthlyBudgetEur: number;
  usedThisMonthEur: number;
  remainingThisMonthEur: number;
  pctUsed: number;
  dailyRecommendedEur: number;
  usedTodayEur: number;
  todayVsRecommendedPct: number;
  paceDaysLeftEstimate?: number;
  locked: boolean;
  lockReason?: string;
};

export default function UsageBar() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch('/api/usage', { cache: 'no-store' });
        const j = await r.json();
        if (mounted && j?.success) setUsage(j.usage);
      } catch {
        // ignore
      }
    };

    load();
    const t = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  if (!usage) return null;

  const pct = Math.max(0, Math.min(100, usage.pctUsed));
  const warnDaily = usage.todayVsRecommendedPct > 110;
  const warnPace = typeof usage.paceDaysLeftEstimate === 'number' && usage.paceDaysLeftEstimate < 10;

  return (
    <div className="w-full rounded-2xl bg-white/6 border border-white/10 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-body text-xs text-text-muted">Budget</div>
            {usage.locked ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-danger/15 text-danger border border-danger/30">
                LOCKED
              </span>
            ) : null}
          </div>
          <div className="font-display text-sm text-text-primary mt-1">
            €{usage.usedThisMonthEur} / €{usage.monthlyBudgetEur} ({pct}%)
          </div>

          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={(usage.locked ? 'bg-danger' : pct > 85 ? 'bg-warning' : 'bg-cyan') + ' h-full'}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-2 text-[11px] text-text-muted font-body">
            Today: €{usage.usedTodayEur} • Recommended/day: ~€{usage.dailyRecommendedEur}
          </div>

          {warnDaily ? (
            <div className="mt-2 text-[11px] font-body text-warning">
              ⚠ You are using more than the recommended daily usage.
            </div>
          ) : null}

          {warnPace ? (
            <div className="mt-1 text-[11px] font-body text-warning">
              ⚠ At this pace, you will reach your limit in ~{usage.paceDaysLeftEstimate} days.
            </div>
          ) : null}

          {usage.lockReason ? (
            <div className="mt-2 text-[11px] font-body text-danger">{usage.lockReason}</div>
          ) : null}
        </div>

        <div className="shrink-0">
          <a
            href="/billing"
            className="px-3 py-2 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors text-xs font-body text-text-secondary">
            Upgrade
          </a>
        </div>
      </div>
    </div>
  );
}
