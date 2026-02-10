"use client";

import { useEffect, useMemo, useState } from "react";
import type { SerializedTask } from "@/lib/types";

function safeDate(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateTime(s?: string) {
  const d = safeDate(s);
  if (!d) return "—";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanDuration(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day}d ${hr % 24}h`;
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m`;
  return `${sec}s`;
}

function getCompletedAt(task: SerializedTask) {
  const completed = task.workLog
    ?.filter((e) => e.action === "completed")
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())?.[0];
  return completed?.createdAt || task.updatedAt;
}

export default function CompletedProjectsPage() {
  const [tasks, setTasks] = useState<SerializedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) setTasks(data.tasks || []);
        else setError(data?.error || "Failed to load tasks");
      } catch (e) {
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const completedProjects = useMemo(() => {
    const topLevelDone = tasks.filter((t) => t.status === "done" && !t.parentId);
    return topLevelDone
      .map((t) => {
        const completedAt = getCompletedAt(t);
        const createdAt = t.createdAt;
        const start = safeDate(createdAt);
        const end = safeDate(completedAt);
        const durationMs = start && end ? end.getTime() - start.getTime() : 0;
        return {
          task: t,
          completedAt,
          durationMs,
        };
      })
      .sort((a, b) => {
        const ad = safeDate(a.completedAt)?.getTime() ?? 0;
        const bd = safeDate(b.completedAt)?.getTime() ?? 0;
        return bd - ad;
      });
  }, [tasks]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-10">
        <div className="max-w-5xl mx-auto pt-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-2xl text-text-primary tracking-wide">Completed</h1>
              <p className="font-body text-sm text-text-muted mt-1">
                Finished top-level projects (done tasks without a parent).
              </p>
            </div>

            <div className="text-right">
              <div className="font-body text-xs text-text-muted">Count</div>
              <div className="font-display text-lg text-text-primary">{completedProjects.length}</div>
            </div>
          </div>

          {loading && (
            <div className="mt-10 text-text-muted font-body text-sm">Loading…</div>
          )}

          {error && !loading && (
            <div className="mt-10 rounded-2xl bg-danger/10 border border-danger/30 p-4">
              <div className="font-display text-sm text-text-primary">Couldn’t load completed projects</div>
              <div className="font-body text-sm text-text-secondary mt-1">{error}</div>
            </div>
          )}

          {!loading && !error && completedProjects.length === 0 && (
            <div className="mt-10 rounded-2xl bg-white/4 border border-white/10 p-8 text-center">
              <p className="font-body text-sm text-text-muted">No completed projects yet.</p>
            </div>
          )}

          <div className="mt-6 grid gap-4">
            {completedProjects.map(({ task, completedAt, durationMs }) => (
              <div key={task.id} className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 glass-card" />
                <div className="absolute inset-0 rounded-3xl border border-white/10" />

                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-display text-base text-text-primary truncate">{task.title}</h2>
                      <p className="font-body text-sm text-text-secondary mt-1 line-clamp-2">
                        {task.description || "(No description)"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[10px] text-text-muted uppercase">Time</div>
                      <div className="font-display text-sm text-text-primary">
                        {durationMs > 0 ? humanDuration(durationMs) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white/4 border border-white/10 px-3 py-2">
                      <div className="font-mono text-[10px] text-text-muted uppercase">Completed</div>
                      <div className="font-body text-xs text-text-secondary mt-0.5">
                        {fmtDateTime(completedAt)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/4 border border-white/10 px-3 py-2">
                      <div className="font-mono text-[10px] text-text-muted uppercase">Created</div>
                      <div className="font-body text-xs text-text-secondary mt-0.5">
                        {fmtDateTime(task.createdAt)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/4 border border-white/10 px-3 py-2">
                      <div className="font-mono text-[10px] text-text-muted uppercase">Assignee</div>
                      <div className="font-body text-xs text-text-secondary mt-0.5">
                        {task.assignee || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
