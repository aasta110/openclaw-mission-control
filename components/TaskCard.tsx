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

const PRIORITY_STYLES = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group relative rounded-xl overflow-hidden
        cursor-grab active:cursor-grabbing
        transition-all duration-300 ease-out
        ${PRIORITY_STYLES[task.priority]}
        ${isBeingDragged 
          ? 'opacity-60 scale-[1.02] rotate-1 shadow-2xl shadow-cyan/20' 
          : 'hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/30'
        }
      `}
    >
      {/* Card background with glass effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface/95 to-deep/95 backdrop-blur-sm" />
      
      {/* Holographic shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </div>
      
      {/* Border glow */}
      <div className="absolute inset-0 rounded-xl border border-elevated/50 group-hover:border-cyan/30 transition-colors" />

      <Link href={`/tasks/${task.id}`} className="block relative p-4" onClick={(e) => e.stopPropagation()}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-body text-sm font-medium text-text-primary line-clamp-2 group-hover:text-cyan-bright transition-colors">
            {task.title}
          </h3>
          <AgentAvatar agentId={task.assignee} size="sm" />
        </div>

        {/* Description */}
        {task.description && (
          <p className="font-body text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Priority and Tags row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} size="sm" />
            {task.status === 'review' && (
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-md tracking-wider uppercase border ${
                  task.reviewStatus === 'approved'
                    ? 'bg-success/10 text-success border-success/30'
                    : task.reviewStatus === 'changes_requested'
                    ? 'bg-danger/10 text-danger border-danger/30'
                    : 'bg-warning/10 text-warning border-warning/30'
                }`}
              >
                {task.reviewStatus || 'pending'}
              </span>
            )}
          </div>
          
          {task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {task.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="cyber-tag px-2 py-0.5 rounded-md"
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

        {/* Footer with metadata */}
        <div className="flex items-center gap-4 pt-3 border-t border-elevated/50">
          {/* Comments */}
          {task.comments.length > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted group-hover:text-cyan/70 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-mono text-[10px]">{task.comments.length}</span>
            </div>
          )}
          
          {/* Work log entries */}
          {task.workLog.length > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted group-hover:text-violet/70 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-mono text-[10px]">{task.workLog.length}</span>
            </div>
          )}
          
          {/* Due date */}
          {task.dueDate && (
            <div className="flex items-center gap-1.5 text-text-muted ml-auto">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[32px] border-l-[32px] border-t-cyan/10 border-l-transparent group-hover:border-t-cyan/20 transition-colors" />
      </div>
    </div>
  );
}

// Non-draggable version for overlay
export function TaskCardOverlay({ task }: { task: SerializedTask }) {
  return (
    <div
      className={`
        relative rounded-xl overflow-hidden w-[300px]
        shadow-2xl shadow-cyan/30
        ${PRIORITY_STYLES[task.priority]}
      `}
    >
      {/* Card background */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface to-deep" />
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-xl border-2 border-cyan/50 animate-pulse-glow" />
      
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-body text-sm font-medium text-text-primary line-clamp-2">
            {task.title}
          </h3>
          <AgentAvatar agentId={task.assignee} size="sm" />
        </div>
        <PriorityBadge priority={task.priority} size="sm" />
      </div>
    </div>
  );
}
