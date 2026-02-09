'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SerializedTask } from '@/lib/types';
import TaskDetail from '@/components/TaskDetail';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<SerializedTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const data = await response.json();
        if (data.success) {
          setTask(data.task);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch task');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-6">
          <div className="cyber-spinner" />
          <div className="text-center">
            <p className="font-mono text-sm text-cyan tracking-wider uppercase animate-pulse">
              Loading Task
            </p>
            <p className="font-mono text-xs text-text-muted mt-2">
              Retrieving mission data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative max-w-md text-center">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/90 to-deep/90 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            
            <div className="relative p-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <h2 className="font-display text-xl font-bold text-text-primary mb-3 tracking-wider">
                MISSION NOT FOUND
              </h2>
              <p className="font-body text-text-secondary mb-6">
                {error || "The task you're looking for doesn't exist or has been archived."}
              </p>
              
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-glow text-void font-mono text-sm tracking-wider uppercase"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5m7-7l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Return to Command
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="px-6 py-8">
        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto mb-6">
          <nav className="flex items-center gap-2">
            <Link 
              href="/" 
              className="font-mono text-xs text-text-muted tracking-wider uppercase hover:text-cyan transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Command
            </Link>
            <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-xs text-cyan tracking-wider uppercase truncate max-w-[200px]">
              {task.title}
            </span>
          </nav>
        </div>

        <TaskDetail task={task} />
      </div>
    </div>
  );
}
