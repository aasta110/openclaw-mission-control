'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type MissionEvent = {
  id: string;
  ts: string;
  source: 'openclaw' | 'ui' | 'system';
  type: string;
  agentId?: string;
  taskId?: string;
  parentId?: string;
  message: string;
  data?: any;
};

function fmtTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

function sourcePill(source: MissionEvent['source']) {
  if (source === 'openclaw') return 'bg-[rgba(10,132,255,0.15)] border-[rgba(10,132,255,0.25)] text-[rgba(245,245,247,0.9)]';
  if (source === 'ui') return 'bg-white/8 border-white/12 text-text-secondary';
  return 'bg-white/6 border-white/10 text-text-muted';
}

export default function ActivityLog({
  variant = 'sidebar',
  open = true,
  onClose,
  className,
}: {
  variant?: 'sidebar' | 'drawer';
  open?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/events?limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (data?.success) setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [events]);

  const content = (
    <div className="relative rounded-3xl overflow-hidden">
      <div className="absolute inset-0 glass-card" />
      <div className="absolute inset-0 rounded-3xl border border-white/10" />

      <div className="relative p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-body text-sm font-semibold text-text-primary tracking-wide">Activity</h2>
          <div className="flex items-center gap-3">
            <span className="font-body text-xs text-text-muted">
              {loading ? 'Loading…' : `${sorted.length} events`}
            </span>
            {variant === 'drawer' && onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-full bg-white/6 border border-white/10 hover:bg-white/10 transition-colors text-xs text-text-secondary"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {sorted.length === 0 && !loading && (
            <div className="text-center py-10">
              <p className="font-body text-xs text-text-muted">No activity yet</p>
            </div>
          )}

          {sorted.map((e) => (
            <div key={e.id} className="rounded-2xl bg-white/4 border border-white/10 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-text-muted">{fmtTime(e.ts)}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${sourcePill(e.source)}`}>
                  {e.source}
                </span>
              </div>

              <div className="mt-1">
                <p className="font-body text-xs text-text-secondary leading-relaxed">
                  {e.agentId ? <span className="text-text-primary">{e.agentId}</span> : null}
                  {e.agentId ? ': ' : ''}
                  {e.message}
                </p>
                <p className="font-mono text-[10px] text-text-muted mt-1 truncate">
                  {e.type}
                  {e.data?.taskTitle
                    ? ` • ${e.data.taskTitle}`
                    : e.taskId
                    ? ` • task ${e.taskId}`
                    : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (variant === 'drawer') {
    if (!open) return null;
    return (
      <div className={cn('fixed inset-0 z-50', className)}>
        <button className="absolute inset-0 bg-black/45" aria-label="Close activity" onClick={onClose} />
        <div className="absolute top-0 right-0 h-full w-[420px] max-w-[92vw] p-4">
          {content}
        </div>
      </div>
    );
  }

  return (
    <aside className={cn('w-[360px] shrink-0', className)}>
      <div className="sticky top-0">{content}</div>
    </aside>
  );
}

