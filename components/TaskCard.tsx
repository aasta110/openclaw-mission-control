'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { SerializedTask } from '@/lib/types';
import AgentAvatar from './AgentAvatar';
import PriorityBadge from './PriorityBadge';

interface TaskCardProps {
  task: SerializedTask;
  isDragging?: boolean;
}

export default function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isBeingDragged = isSortableDragging || isDragging;

  const reviewPill =
    task.status === 'review'
      ? task.reviewStatus === 'approved'
        ? 'bg-success/15 text-success border-success/30'
        : task.reviewStatus === 'changes_requested'
        ? 'bg-danger/15 text-danger border-danger/30'
        : 'bg-warning/15 text-warning border-warning/30'
      : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        `group relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing ` +
        `transition-all duration-200 ` +
        (isBeingDragged
          ? 'opacity-70 scale-[1.01] shadow-2xl shadow-black/30'
          : 'hover:-translate-y-[1px] hover:shadow-xl hover:shadow-black/20')
      }
    >
      {/* Glass surface */}
      <div className="absolute inset-0 glass-card" />
      <div className="absolute inset-0 rounded-2xl border border-white/10" />

      <Link
        href={`/tasks/${task.id}`}
        className="block relative p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-body text-sm font-semibold text-text-primary line-clamp-2">
            {task.title}
          </h3>
          <AgentAvatar agentId={task.assignee} size="sm" />
        </div>

        {task.description && (
          <p className="font-body text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} size="sm" />
            {reviewPill && (
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${reviewPill}`}>
                {task.reviewStatus || 'pending'}
              </span>
            )}
          </div>

          {task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {task.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-text-muted"
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 2 && (
                <span className="font-mono text-[10px] text-text-muted">
                  +{task.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-3 border-t border-white/10">
          {task.comments.length > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mono text-[10px]">{task.comments.length}</span>
            </div>
          )}

          {task.workLog.length > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mono text-[10px]">{task.workLog.length}</span>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-1.5 text-text-muted ml-auto">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-mono text-[10px]">
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

export function TaskCardOverlay({ task }: { task: SerializedTask }) {
  return (
    <div className="relative rounded-2xl overflow-hidden w-[320px] shadow-2xl shadow-black/35">
      <div className="absolute inset-0 glass-card" />
      <div className="absolute inset-0 rounded-2xl border border-white/14" />
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-body text-sm font-semibold text-text-primary line-clamp-2">
            {task.title}
          </h3>
          <AgentAvatar agentId={task.assignee} size="sm" />
        </div>
        <PriorityBadge priority={task.priority} size="sm" />
      </div>
    </div>
  );
}
