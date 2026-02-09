'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SerializedTask,
  TaskStatus,
  TaskPriority,
  AgentId,
  AGENTS,
  COLUMNS,
} from '@/lib/types';
import { AGENT_CONFIG } from '@/lib/config';
import AgentAvatar from './AgentAvatar';
import PriorityBadge from './PriorityBadge';
import DeliverableModal from './DeliverableModal';

interface TaskDetailProps {
  task: SerializedTask;
}

// State for individual deliverable
interface DeliverableState {
  content: string | null;
  loading: boolean;
  error: string | null;
}

// Modal state
interface ModalState {
  isOpen: boolean;
  path: string | null;
}

export default function TaskDetail({ task: initialTask }: TaskDetailProps) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [loading, setLoading] = useState(false);
  const [deliverableStates, setDeliverableStates] = useState<Record<string, DeliverableState>>({});
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, path: null });
  
  // Comment form state
  const [commentAuthor, setCommentAuthor] = useState<AgentId>(AGENT_CONFIG.agents[0].id);

  // Review form state
  const [reviewer, setReviewer] = useState<AgentId>('main');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Get all deliverables (combining old single deliverable with new array for backward compatibility)
  const allDeliverables = React.useMemo(() => {
    const deliverables: string[] = [];
    // Add from deliverables array first
    if (task.deliverables && task.deliverables.length > 0) {
      deliverables.push(...task.deliverables);
    }
    // Add old single deliverable if not already in array (backward compatibility)
    if (task.deliverable && !deliverables.includes(task.deliverable)) {
      deliverables.unshift(task.deliverable);
    }
    return deliverables;
  }, [task.deliverable, task.deliverables]);

  // Initialize deliverable states when deliverables change
  useEffect(() => {
    const newStates: Record<string, DeliverableState> = {};
    allDeliverables.forEach((path) => {
      newStates[path] = deliverableStates[path] || {
        content: null,
        loading: false,
        error: null,
      };
    });
    setDeliverableStates(newStates);
  }, [allDeliverables.join(',')]);

  // Fetch deliverable content
  const fetchDeliverable = async (path: string) => {
    setDeliverableStates(prev => ({
      ...prev,
      [path]: { ...prev[path], loading: true, error: null }
    }));

    try {
      // Encode the path for the API
      const encodedPath = path
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
      
      const response = await fetch(`/api/files/${encodedPath}`);
      const data = await response.json();

      if (data.success) {
        setDeliverableStates(prev => ({
          ...prev,
          [path]: { ...prev[path], content: data.content, loading: false }
        }));
      } else {
        setDeliverableStates(prev => ({
          ...prev,
          [path]: { ...prev[path], error: data.error || 'Failed to load deliverable', loading: false }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch deliverable:', error);
      setDeliverableStates(prev => ({
        ...prev,
        [path]: { ...prev[path], error: 'Failed to load deliverable', loading: false }
      }));
    }
  };

  // Open deliverable in modal
  const openDeliverable = (path: string) => {
    setModalState({ isOpen: true, path });
    
    // Fetch content if not loaded yet
    const currentState = deliverableStates[path];
    if (!currentState?.content && !currentState?.loading && !currentState?.error) {
      fetchDeliverable(path);
    }
  };

  // Close modal
  const closeModal = () => {
    setModalState({ isOpen: false, path: null });
  };

  // Get current modal deliverable state
  const currentModalState = modalState.path ? deliverableStates[modalState.path] : null;
  const currentModalFilename = modalState.path?.split('/').pop() || '';

  const handleUpdate = async (updates: Partial<SerializedTask>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.success) {
        setTask(data.task);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || commentSubmitting) return;

    setCommentSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: commentAuthor,
          content: commentContent.trim(),
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        // Clear the form
        setCommentContent('');
        
        // Refresh task to get updated comments
        const taskResponse = await fetch(`/api/tasks/${task.id}`);
        const taskData = await taskResponse.json();
        if (taskData.success) {
          setTask(taskData.task);
        }
      } else {
        console.error('Failed to add comment:', data.error);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const creator = AGENTS.find((a) => a.id === task.createdBy);
  const assignee = task.assignee ? AGENTS.find((a) => a.id === task.assignee) : null;
  const currentColumn = COLUMNS.find((c) => c.id === task.status);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-surface/90 to-deep/90 backdrop-blur-xl" />
        <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan/50 via-violet/50 to-magenta/50" />
        
        <div className="relative p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              {/* Status and Priority */}
              <div className="flex items-center gap-3 mb-4">
                <PriorityBadge priority={task.priority} />
                <div className="w-px h-5 bg-elevated" />
                <span className="font-mono text-xs text-text-muted tracking-wider uppercase">
                  {currentColumn?.title}
                </span>
              </div>
              
              {/* Title */}
              <h1 className="font-display text-3xl font-bold tracking-wide text-text-primary mb-4">
                {task.title}
              </h1>
              
              {/* Meta */}
              <div className="flex items-center gap-4 font-mono text-xs text-text-muted">
                <span className="flex items-center gap-2">
                  <span className="text-lg">{creator?.emoji}</span>
                  Created by {creator?.name}
                </span>
                <span className="text-elevated">•</span>
                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              {task.assignee === 'main' && (
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await fetch(`/api/tasks/${task.id}/run`, { method: 'POST' });
                      // Refresh task
                      const taskResponse = await fetch(`/api/tasks/${task.id}`);
                      const taskData = await taskResponse.json();
                      if (taskData.success) setTask(taskData.task);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="group px-4 py-2.5 rounded-xl bg-cyan/10 border border-cyan/30 hover:bg-cyan/20 transition-colors"
                  title="Start this mission (move subtasks to TODO)"
                >
                  <span className="flex items-center gap-2 font-mono text-xs text-cyan tracking-wider uppercase">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 3l14 9-14 9V3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Run
                  </span>
                </button>
              )}

              <button
                onClick={handleDelete}
                disabled={loading}
                className="group px-4 py-2.5 rounded-xl bg-danger/10 border border-danger/30 hover:bg-danger/20 transition-colors"
              >
                <span className="flex items-center gap-2 font-mono text-xs text-danger tracking-wider uppercase">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Delete
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Gate */}
          {task.status === 'review' && (
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
              <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet/50 via-cyan/50 to-success/50" />

              <div className="relative p-6">
                <h2 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-violet-bright" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Review
                  <span className={`font-mono text-[10px] tracking-wider px-2 py-1 rounded-md border uppercase ${
                    task.reviewStatus === 'approved'
                      ? 'bg-success/10 text-success border-success/30'
                      : task.reviewStatus === 'changes_requested'
                      ? 'bg-danger/10 text-danger border-danger/30'
                      : 'bg-warning/10 text-warning border-warning/30'
                  }`}>
                    {task.reviewStatus || 'pending'}
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-2">Reviewer</label>
                    <select
                      value={reviewer}
                      onChange={(e) => setReviewer(e.target.value as AgentId)}
                      disabled={reviewSubmitting}
                      className="w-full px-4 py-3 rounded-xl cyber-select text-text-primary font-body"
                    >
                      {AGENTS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.emoji} {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-2">Notes (optional)</label>
                    <input
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      disabled={reviewSubmitting}
                      className="w-full px-4 py-3 rounded-xl bg-abyss/50 border border-elevated/30 text-text-primary font-body text-sm placeholder-text-muted/50 focus:outline-none focus:border-cyan/50 transition-colors"
                      placeholder="What looks good / what needs changes"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    disabled={reviewSubmitting}
                    onClick={async () => {
                      setReviewSubmitting(true);
                      try {
                        const resp = await fetch(`/api/tasks/${task.id}/review`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reviewer, decision: 'approved', notes: reviewNotes }),
                        });
                        const data = await resp.json();
                        if (data.success) setTask(data.task);
                      } finally {
                        setReviewSubmitting(false);
                      }
                    }}
                    className="group px-4 py-2.5 rounded-xl bg-success/10 border border-success/30 hover:bg-success/20 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-mono text-xs text-success tracking-wider uppercase">
                      Approve
                    </span>
                  </button>

                  <button
                    disabled={reviewSubmitting}
                    onClick={async () => {
                      setReviewSubmitting(true);
                      try {
                        const resp = await fetch(`/api/tasks/${task.id}/review`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reviewer, decision: 'changes_requested', notes: reviewNotes }),
                        });
                        const data = await resp.json();
                        if (data.success) setTask(data.task);
                      } finally {
                        setReviewSubmitting(false);
                      }
                    }}
                    className="group px-4 py-2.5 rounded-xl bg-danger/10 border border-danger/30 hover:bg-danger/20 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-mono text-xs text-danger tracking-wider uppercase">
                      Request changes
                    </span>
                  </button>

                  {task.reviewedBy && (
                    <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-text-muted">
                      <span>Reviewed by</span>
                      <span className="text-text-primary">{task.reviewedBy}</span>
                      {task.reviewedAt && <span>{new Date(task.reviewedAt).toLocaleString()}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Description */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            <div className="relative p-6">
              <h2 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Mission Brief
              </h2>
              <p className="font-body text-text-secondary whitespace-pre-wrap leading-relaxed">
                {task.description}
              </p>
            </div>
          </div>

          {/* Deliverables Section */}
          {allDeliverables.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
              <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success/50 via-cyan/50 to-violet/50" />
              
              <div className="relative p-6">
                {/* Header */}
                <h2 className="font-display text-lg font-semibold text-text-primary flex items-center gap-3 mb-5">
                  <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Deliverables
                  <span className="font-mono text-xs text-text-muted tracking-wider px-2 py-1 rounded-md bg-elevated/30 border border-elevated/50">
                    {allDeliverables.length} file{allDeliverables.length !== 1 ? 's' : ''}
                  </span>
                </h2>

                {/* Deliverable Files Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {allDeliverables.map((path) => {
                    const state = deliverableStates[path] || { content: null, loading: false, error: null };
                    const filename = path.split('/').pop() || path;
                    const extension = filename.split('.').pop() || 'md';
                    
                    return (
                      <button
                        key={path}
                        onClick={() => openDeliverable(path)}
                        className="group w-full p-4 rounded-xl bg-abyss/40 border border-elevated/30 hover:border-cyan/40 hover:bg-abyss/60 transition-all duration-300 text-left"
                      >
                        <div className="flex items-center gap-4">
                          {/* File icon */}
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan/10 to-violet/10 border border-cyan/20 flex items-center justify-center group-hover:border-cyan/40 group-hover:shadow-glow-cyan/20 transition-all">
                            <svg className="w-6 h-6 text-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          
                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-body text-sm font-medium text-text-primary truncate group-hover:text-cyan-bright transition-colors">
                                {filename}
                              </span>
                              <span className="font-mono text-[10px] text-cyan/70 tracking-wider px-1.5 py-0.5 rounded bg-cyan/10 border border-cyan/20 uppercase">
                                {extension}
                              </span>
                              {state.content && (
                                <span className="font-mono text-[10px] text-success/70 tracking-wider px-1.5 py-0.5 rounded bg-success/10 border border-success/20 uppercase">
                                  loaded
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-text-muted truncate">
                              {path}
                            </p>
                          </div>
                          
                          {/* Open indicator */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="font-mono text-[10px] text-cyan tracking-wider uppercase">
                              Read
                            </span>
                            <svg className="w-5 h-5 text-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Work Log */}
          {task.workLog.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
              <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
              <div className="relative p-6">
                <h2 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-violet-bright" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Activity Log
                </h2>
                <div className="space-y-4">
                  {task.workLog.map((entry, index) => {
                    const agent = AGENTS.find((a) => a.id === entry.agent);
                    return (
                      <div key={entry.id} className="flex items-start gap-4">
                        <div className="relative">
                          <AgentAvatar agentId={entry.agent as AgentId} size="sm" />
                          {index < task.workLog.length - 1 && (
                            <div className="absolute top-8 left-1/2 w-px h-8 -translate-x-1/2 bg-gradient-to-b from-elevated to-transparent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="font-body text-sm font-medium text-text-primary">
                              {agent?.name}
                            </span>
                            <span
                              className={`font-mono text-[10px] px-2 py-0.5 rounded-md tracking-wider uppercase ${
                                entry.action === 'completed'
                                  ? 'bg-success/10 text-success border border-success/30'
                                  : entry.action === 'blocked'
                                  ? 'bg-danger/10 text-danger border border-danger/30'
                                  : entry.action === 'picked'
                                  ? 'bg-info/10 text-info border border-info/30'
                                  : 'bg-muted/20 text-text-muted border border-muted/30'
                              }`}
                            >
                              {entry.action}
                            </span>
                            <span className="font-mono text-[10px] text-text-muted">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-body text-sm text-text-secondary">{entry.note}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            <div className="relative p-6">
              <h2 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Discussion ({task.comments.length})
              </h2>

              {task.comments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {task.comments.map((comment) => {
                    const author = AGENTS.find((a) => a.id === comment.author);
                    return (
                      <div key={comment.id} className="flex items-start gap-3">
                        <AgentAvatar agentId={comment.author as AgentId} size="sm" />
                        <div className="flex-1 p-4 rounded-xl bg-abyss/50 border border-elevated/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-body text-sm font-medium text-text-primary">
                              {author?.name || comment.author}
                            </span>
                            <span className="font-mono text-[10px] text-text-muted">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-body text-sm text-text-secondary">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-elevated/50 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-mono text-xs text-text-muted">No comments yet</p>
                </div>
              )}

              {/* Comment Form */}
              <form onSubmit={handleCommentSubmit} className="border-t border-elevated/30 pt-5">
                <div className="flex items-center gap-3 mb-4">
                  <label className="font-mono text-[10px] text-text-muted tracking-wider uppercase">
                    Comment as
                  </label>
                  <select
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value as AgentId)}
                    disabled={commentSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-abyss/50 border border-elevated/30 text-text-primary font-body text-sm focus:outline-none focus:border-cyan/50 transition-colors"
                  >
                    {AGENTS.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.emoji} {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write a comment... Use @name to mention agents"
                  disabled={commentSubmitting}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-abyss/50 border border-elevated/30 text-text-primary font-body text-sm placeholder-text-muted/50 focus:outline-none focus:border-cyan/50 resize-none transition-colors"
                />
                
                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    disabled={commentSubmitting || !commentContent.trim()}
                    className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan/20 to-violet/20 border border-cyan/30 hover:border-cyan/50 hover:from-cyan/30 hover:to-violet/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <span className="flex items-center gap-2 font-mono text-xs text-cyan tracking-wider uppercase">
                      {commentSubmitting ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4m0 12v4m-8-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Send
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            <div className="relative p-5">
              <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-3">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) => handleUpdate({ status: e.target.value as TaskStatus })}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl cyber-select text-text-primary font-body"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            <div className="relative p-5">
              <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-3">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => handleUpdate({ priority: e.target.value as TaskPriority })}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl cyber-select text-text-primary font-body"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            <div className="relative p-5">
              <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-3">
                Assigned Agent
              </label>
              <select
                value={task.assignee || ''}
                onChange={(e) =>
                  handleUpdate({ assignee: (e.target.value as AgentId) || null })
                }
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl cyber-select text-text-primary font-body"
              >
                <option value="">Unassigned</option>
                {AGENTS.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.emoji} {agent.name}
                  </option>
                ))}
              </select>
              {assignee && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-elevated/30">
                  <AgentAvatar agentId={task.assignee} size="lg" />
                  <div>
                    <p className="font-body text-sm font-medium text-text-primary">{assignee.name}</p>
                    <p className="font-mono text-[10px] text-text-muted tracking-wider uppercase">{assignee.role}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            <div className="relative p-5">
              <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-3">
                Tags
              </label>
              {task.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span key={tag} className="cyber-tag px-3 py-1.5 rounded-lg">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-xs text-text-muted italic">No tags</p>
              )}
            </div>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
              <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
              <div className="relative p-5">
                <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-3">
                  Deadline
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-body text-text-primary">
                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Updated */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface/80 to-deep/80 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-2xl border border-elevated/50" />
            <div className="relative p-5">
              <label className="block font-mono text-[10px] text-text-muted tracking-wider uppercase mb-3">
                Last Updated
              </label>
              <p className="font-mono text-sm text-text-secondary">
                {new Date(task.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deliverable Modal */}
      <DeliverableModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        content={currentModalState?.content || null}
        filename={currentModalFilename}
        filepath={modalState.path || ''}
        loading={currentModalState?.loading}
        error={currentModalState?.error}
        onRetry={modalState.path ? () => fetchDeliverable(modalState.path!) : undefined}
      />
    </div>
  );
}
