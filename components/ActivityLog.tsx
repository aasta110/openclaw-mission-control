'use client';

import { useEffect, useMemo, useState } from 'react';

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
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

export default function ActivityLog({
  variant = 'sidebar',
  open = true,
  onClose,
}: {
  variant?: 'sidebar' | 'drawer';
  open?: boolean;
  onClose?: () => void;
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
    <div className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
      <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan/50 via-violet/50 to-magenta/50" />

      <div className="relative p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold tracking-wider text-text-primary uppercase">
            Activity
          </h2>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-text-muted tracking-wider uppercase">
              {loading ? 'Loading…' : `${sorted.length} events`}
            </span>
            {variant === 'drawer' && onClose && (
              <button
                onClick={onClose}
                className="px-2 py-1 rounded-lg bg-elevated/30 border border-elevated/50 hover:bg-elevated/50 transition-colors font-mono text-[10px] text-text-secondary uppercase"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {sorted.length === 0 && !loading && (
            <div className="text-center py-10">
              <p className="font-mono text-xs text-text-muted">No activity yet</p>
            </div>
          )}

          {sorted.map((e) => (
            <div
              key={e.id}
              className="rounded-xl bg-abyss/40 border border-elevated/30 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-text-muted">
                  {fmtTime(e.ts)}
                </span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded border tracking-wider uppercase ${
                    e.source === 'openclaw'
                      ? 'bg-cyan/10 text-cyan border-cyan/30'
                      : e.source === 'ui'
                      ? 'bg-violet/10 text-violet-300 border-violet-400/30'
                      : 'bg-elevated/30 text-text-muted border-elevated/50'
                  }`}
                >
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
      <div className="fixed inset-0 z-50">
        <button
          className="absolute inset-0 bg-black/40"
          aria-label="Close activity"
          onClick={onClose}
        />
        <div className="absolute top-0 right-0 h-full w-[420px] max-w-[92vw] p-4">
          {content}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden xl:block w-[360px] shrink-0">
      <div className="sticky top-0">{content}</div>
    </aside>
  );
}

