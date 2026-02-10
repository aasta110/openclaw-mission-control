export type AgentId = string;
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type ReviewStatus = 'pending' | 'approved' | 'changes_requested';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AgentStatus = 'active' | 'working' | 'idle' | 'offline';
export type WorkLogAction = 'picked' | 'progress' | 'blocked' | 'completed' | 'dropped';

// Mention types for @mentions feature
export interface Mention {
  id: string;
  taskId: string;
  taskTitle: string; // Denormalized for display
  commentId: string;
  author: string; // Who wrote the comment
  mentionedAgent: AgentId; // Who was mentioned
  content: string; // The comment text
  createdAt: string;
  read: boolean;
}

export interface SerializedMention {
  id: string;
  taskId: string;
  taskTitle: string;
  commentId: string;
  author: string;
  mentionedAgent: AgentId;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface WorkLogEntry {
  id: string;
  agent: string;
  action: WorkLogAction;
  note: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: AgentId | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  order: number; // sort key within a status column (lower = higher)
  dueDate?: string;
  tags: string[];
  comments: Comment[];
  workLog: WorkLogEntry[];
  deliverable?: string; // DEPRECATED: Use deliverables instead. Kept for backward compatibility
  deliverables?: string[];

  // Review gate
  reviewStatus?: ReviewStatus;
  reviewedBy?: AgentId;
  reviewedAt?: string;
  reviewNotes?: string;

  // Orchestration
  parentId?: string;
}

export interface Agent {
  id: AgentId;
  name: string;
  emoji: string;
  role: string;
  focus: string;
  status: AgentStatus;
  currentTask: string | null;
  lastSeen: string;
}

// Serialized versions for API responses
export interface SerializedComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface SerializedWorkLogEntry {
  id: string;
  agent: string;
  action: WorkLogAction;
  note: string;
  createdAt: string;
}

export interface SerializedTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: AgentId | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  dueDate?: string;
  tags: string[];
  comments: SerializedComment[];
  workLog: SerializedWorkLogEntry[];
  deliverable?: string;
  deliverables?: string[];
  reviewStatus?: ReviewStatus;
  reviewedBy?: AgentId;
  reviewedAt?: string;
  reviewNotes?: string;
  parentId?: string;
}

export interface SerializedAgent {
  id: AgentId;
  name: string;
  emoji: string;
  role: string;
  focus: string;
  status: AgentStatus;
  currentTask: string | null;
  lastSeen: string;
}

export const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  urgent: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  low: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500' },
};

export const STATUS_COLORS: Record<AgentStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-500', text: 'text-green-400' },
  working: { bg: 'bg-blue-500', text: 'text-blue-400' },
  idle: { bg: 'bg-yellow-500', text: 'text-yellow-400' },
  offline: { bg: 'bg-gray-500', text: 'text-gray-400' },
};

// NOTE: UI components import AGENTS for avatar/name rendering.
// In production this should likely come from the agents data store/API,
// but exporting an empty list keeps the dev server compiling.
export const AGENTS: Agent[] = [];
