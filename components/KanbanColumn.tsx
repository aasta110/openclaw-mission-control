'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SerializedTask, TaskStatus, COLUMNS } from '@/lib/types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: SerializedTask[];
}

const STATUS_LABEL: Record<TaskStatus, { title: string; tint: string }> = {
  backlog: { title: 'Backlog', tint: 'bg-white/6 border-white/10' },
  todo: { title: 'Todo', tint: 'bg-white/6 border-white/10' },
  in_progress: { title: 'In Progress', tint: 'bg-white/6 border-white/10' },
  review: { title: 'Review', tint: 'bg-white/6 border-white/10' },
  done: { title: 'Done', tint: 'bg-white/6 border-white/10' },
};

export default function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const column = COLUMNS.find((c) => c.id === status);
  const meta = STATUS_LABEL[status];

  return (
    <div className="flex flex-col min-w-[340px] max-w-[340px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="font-body text-sm font-semibold text-text-primary tracking-wide">
            {column?.title || meta.title}
          </h2>
        </div>

        <div
          className={
            `min-w-[28px] h-7 px-2.5 rounded-full border flex items-center justify-center ` +
            (tasks.length > 0
              ? 'bg-white/8 border-white/12 text-text-primary'
              : 'bg-white/4 border-white/10 text-text-muted')
          }
        >
          <span className="font-mono text-[11px]">{tasks.length}</span>
        </div>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={
          `relative flex-1 p-3 rounded-3xl border transition-colors duration-150 ` +
          (isOver
            ? 'bg-white/6 border-[rgba(10,132,255,0.55)]'
            : 'bg-white/4 border-white/10')
        }
      >
        <div className="absolute inset-0 rounded-3xl pointer-events-none" />

        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <span className="font-body text-xs text-text-muted">No tasks</span>
          </div>
        )}
      </div>
    </div>
  );
}
