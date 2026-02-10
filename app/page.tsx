"use client";

import { useEffect, useState } from "react";
import { SerializedTask } from "@/lib/types";
import KanbanBoard from "@/components/KanbanBoard";
import ActivityLog from "@/components/ActivityLog";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<SerializedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activity panel toggle (desktop: sidebar, mobile: drawer)
  const [activitySidebarOpen, setActivitySidebarOpen] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks");
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError("Failed to fetch tasks");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Poll for updates every 60 seconds
    const interval = setInterval(fetchTasks, 60_000);
    return () => clearInterval(interval);
  }, []);

  // When the Activity sidebar opens/closes, nudge the kanban scroll so the right-most column
  // (e.g. DONE) doesn't get hidden behind the sidebar on narrower desktops.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)"); // lg
    if (!mq.matches) return;

    const el = document.getElementById("kanban-scroll");
    if (!el) return;

    const delta = 360 + 24; // sidebar width + gap
    const dir = activitySidebarOpen ? 1 : -1;

    try {
      // scrollBy keeps current position; moving content left = scroll right
      (el as any).scrollBy?.({ left: dir * delta, behavior: "smooth" });
    } catch {
      el.scrollLeft = Math.max(0, el.scrollLeft + dir * delta);
    }
  }, [activitySidebarOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-6">
          {/* Futuristic loading spinner */}
          <div className="relative">
            <div className="cyber-spinner" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-void" />
            </div>
          </div>

          <div className="text-center">
            <p className="font-display text-sm text-text-primary tracking-wide">
              Loading Mission Control…
            </p>
            <p className="font-body text-xs text-text-muted mt-2">
              Fetching tasks and activity.
            </p>
          </div>

          {/* Loading bar */}
          <div className="w-48 h-1 rounded-full bg-deep overflow-hidden">
            <div className="h-full loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative max-w-md text-center">
          {/* Error card */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/90 to-deep/90 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-danger/30" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-danger/50" />

            <div className="relative p-8">
              {/* Error icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-danger"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2">
                  <path
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2 className="font-display text-xl font-semibold text-text-primary mb-3 tracking-wide">
                Something went wrong
              </h2>
              <p className="font-body text-text-secondary mb-2">{error}</p>
              <p className="font-mono text-xs text-text-muted mb-6">
                Check that the{" "}
                <code className="px-2 py-0.5 rounded bg-elevated text-cyan">
                  data/
                </code>{" "}
                directory is writable
              </p>

              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl btn-glow text-void font-display text-sm tracking-wide">
                Retry Connection
              </button>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-danger/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-danger/5 rounded-full blur-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Scroll container so you can reach the bottom on smaller screens */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Controls row */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setActivitySidebarOpen((v) => !v)}
              className="group px-4 py-2 rounded-xl bg-white/6 border border-white/10 hover:bg-white/10 transition-colors"
              aria-pressed={activitySidebarOpen}
              aria-label={activitySidebarOpen ? "Close activity" : "Open activity"}>
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2">
                  <path
                    d="M5 12h4l2 5 2-10 2 5h4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-body text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                  {activitySidebarOpen ? "Hide activity" : "Show activity"}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="flex gap-6 px-6 pb-6 pt-4">
          <div className="flex-1 min-w-0 transition-[width] duration-300">
            <KanbanBoard initialTasks={tasks} />
          </div>

          {/* Sidebar (animates width/opacity) */}
          <div
            className={
              "hidden lg:block overflow-hidden transition-[width,opacity,transform] duration-300 ease-out " +
              (activitySidebarOpen
                ? "w-[360px] opacity-100 translate-x-0"
                : "w-0 opacity-0 translate-x-4 pointer-events-none")
            }>
            <ActivityLog variant="sidebar" className="w-[360px]" />
          </div>

          {/* Small-screen drawer */}
          <ActivityLog
            variant="drawer"
            open={activitySidebarOpen}
            onClose={() => setActivitySidebarOpen(false)}
            className="lg:hidden"
          />
        </div>
      </div>
    </div>
  );
}

