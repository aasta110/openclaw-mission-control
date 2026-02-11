import { promises as fs } from "fs";
import * as path from "path";
import {
  Task,
  Agent,
  Mention,
  SerializedTask,
  SerializedAgent,
  SerializedMention,
  TaskStatus,
  TaskPriority,
  AgentId,
  AgentStatus,
  WorkLogAction,
  Comment,
  WorkLogEntry,
} from "./types";
import { ensureConsumerAgents } from "./seed-consumer-agents";
import { AGENT_CONFIG } from "./config";
import { v4 as uuidv4 } from "uuid";

// Data directory path
const DATA_DIR = path.join(process.cwd(), "data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");
const MENTIONS_FILE = path.join(DATA_DIR, "mentions.json");

// Ensure data directory and files exist
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function ensureFile(
  filePath: string,
  defaultContent: string = "[]",
): Promise<void> {
  await ensureDataDir();
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, defaultContent, "utf-8");
  }
}

// Atomic-ish write on Windows: write to temp file then move into place.
// Note: On Windows, fs.rename(tmp, existingPath) can fail if the destination exists.
// We fall back to copy+replace to keep the system functioning.
async function atomicWrite(filePath: string, data: unknown): Promise<void> {
  await ensureDataDir();

  // Transient file locks are common on Windows (AV scans, editor watchers, concurrent reads).
  // Do a couple of small retries to avoid surfacing flaky 500s on PATCH.
  const maxAttempts = 3;
  const backoffMs = [0, 50, 120];

  let lastErr: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tmpFile = filePath + ".tmp." + Date.now() + "." + attempt;

    try {
      if (backoffMs[attempt]) {
        await new Promise((r) => setTimeout(r, backoffMs[attempt]));
      }

      await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");

      try {
        // Fast path (works on many platforms when destination doesn't exist)
        await fs.rename(tmpFile, filePath);
        return;
      } catch (err: any) {
        // Windows-safe fallback: copy over the destination, then delete temp.
        // This is not perfectly atomic, but avoids hard failures that break PATCH.
        const code = err?.code;
        if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'EACCES') {
          throw err;
        }

        await fs.copyFile(tmpFile, filePath);
        await fs.unlink(tmpFile);
        return;
      }
    } catch (err) {
      lastErr = err;
      // Clean up temp file on error
      try {
        await fs.unlink(tmpFile);
      } catch {
        /* ignore */
      }
    }
  }

  throw lastErr;
}

// Read helpers
async function readTasks(): Promise<Task[]> {
  await ensureFile(TASKS_FILE);
  const content = await fs.readFile(TASKS_FILE, "utf-8");
  try {
    return JSON.parse(content) as Task[];
  } catch {
    return [];
  }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await atomicWrite(TASKS_FILE, tasks);
}

async function readAgents(): Promise<Agent[]> {
  await ensureFile(AGENTS_FILE);
  const content = await fs.readFile(AGENTS_FILE, "utf-8");
  try {
    return JSON.parse(content) as Agent[];
  } catch {
    return [];
  }
}

async function writeAgents(agents: Agent[]): Promise<void> {
  await atomicWrite(AGENTS_FILE, agents);
}

async function readMentions(): Promise<Mention[]> {
  await ensureFile(MENTIONS_FILE);
  const content = await fs.readFile(MENTIONS_FILE, "utf-8");
  try {
    return JSON.parse(content) as Mention[];
  } catch {
    return [];
  }
}

async function writeMentions(mentions: Mention[]): Promise<void> {
  await atomicWrite(MENTIONS_FILE, mentions);
}

// ============ SERIALIZATION ============

export function serializeTask(task: Task): SerializedTask {
  // Handle backward compatibility: merge old deliverable into deliverables array
  let deliverables = task.deliverables || [];
  if (task.deliverable && !deliverables.includes(task.deliverable)) {
    deliverables = [task.deliverable, ...deliverables];
  }

  return {
    ...task,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    reviewStatus: (task as any).reviewStatus,
    reviewedBy: (task as any).reviewedBy,
    reviewedAt: (task as any).reviewedAt,
    reviewNotes: (task as any).reviewNotes,
    dueDate: task.dueDate || undefined,
    deliverable: task.deliverable,
    deliverables: deliverables.length > 0 ? deliverables : undefined,
    parentId: task.parentId,
    comments: task.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt,
    })),
    workLog: task.workLog.map((w) => ({
      ...w,
      createdAt: w.createdAt,
    })),
  };
}

export function serializeAgent(agent: Agent): SerializedAgent {
  return {
    ...agent,
    lastSeen: agent.lastSeen,
  };
}

export function serializeMention(mention: Mention): SerializedMention {
  return {
    ...mention,
    createdAt: mention.createdAt,
  };
}

// ============ TASK OPERATIONS ============

export async function getTasks(filters?: {
  status?: TaskStatus;
  assignee?: AgentId;
  priority?: TaskPriority;
}): Promise<Task[]> {
  let tasks = await readTasks();

  if (filters?.status) {
    tasks = tasks.filter((t) => t.status === filters.status);
  }
  if (filters?.assignee) {
    tasks = tasks.filter((t) => t.assignee === filters.assignee);
  }
  if (filters?.priority) {
    tasks = tasks.filter((t) => t.priority === filters.priority);
  }

  // Sort by column order first (ascending), then fallback to createdAt desc
  tasks.sort((a, b) => {
    const ao = typeof (a as any).order === 'number' ? (a as any).order : Number.MAX_SAFE_INTEGER;
    const bo = typeof (b as any).order === 'number' ? (b as any).order : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return tasks;
}

export async function getTask(id: string): Promise<Task | null> {
  const tasks = await readTasks();
  return tasks.find((t) => t.id === id) || null;
}

export async function createTask(data: {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee?: AgentId | null;
  createdBy: string;
  tags?: string[];
  dueDate?: Date;
  parentId?: string;
}): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = {
    id: uuidv4(),
    title: data.title,
    description: data.description,
    status: "backlog" as TaskStatus,
    priority: data.priority,
    assignee: data.assignee || null,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
    order: Date.now(),
    tags: data.tags || [],
    comments: [],
    workLog: [],
    ...(data.parentId ? { parentId: data.parentId } : {}),
    ...(data.dueDate && { dueDate: data.dueDate.toISOString() }),
  };

  const tasks = await readTasks();
  tasks.push(task);
  await writeTasks(tasks);

  return task;
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee: AgentId | null;
    tags: string[];
    dueDate: Date | null;
    deliverable: string | null;
    deliverables: string[] | null;
    order: number | null;
    // review gate
    reviewStatus: 'pending' | 'approved' | 'changes_requested';
    reviewedBy: AgentId;
    reviewedAt: Date;
    reviewNotes: string | null;
  }>,
): Promise<Task | null> {
  const tasks = await readTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // Parent gating: a parent mission cannot be marked DONE until all child tasks are approved.
  if (data.status === 'done') {
    const children = tasks.filter((t) => (t as any).parentId === id);
    if (children.length > 0) {
      const notApproved = children.filter((c: any) => c.reviewStatus !== 'approved');
      if (notApproved.length > 0) {
        throw new Error(
          `Cannot mark parent DONE: ${notApproved.length}/${children.length} subtasks are not approved`,
        );
      }
    }
  }

  // If a task is entering review and doesn't have a reviewStatus yet, default to pending.
  const enteringReview = data.status === 'review';
  if (enteringReview && !(tasks[index] as any).reviewStatus && !('reviewStatus' in data)) {
    (tasks[index] as any).reviewStatus = 'pending';
  }

  const updateFields: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.dueDate !== undefined) {
    updateFields.dueDate = data.dueDate
      ? data.dueDate.toISOString()
      : undefined;
  }

  // Remove the raw Date object if present (we've converted it above)
  if ("dueDate" in data) {
    delete updateFields.dueDate;
    tasks[index].dueDate = data.dueDate
      ? data.dueDate.toISOString()
      : undefined;
  }

  // Convert review timestamp
  if ((data as any).reviewedAt !== undefined) {
    (tasks[index] as any).reviewedAt = (data as any).reviewedAt
      ? (data as any).reviewedAt.toISOString()
      : undefined;
    delete (updateFields as any).reviewedAt;
  }

  // Apply updates
  const { dueDate: _dd, ...otherFields } = updateFields;
  Object.assign(tasks[index], otherFields);
  tasks[index].updatedAt = new Date().toISOString();

  await writeTasks(tasks);
  return tasks[index];
}

export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await readTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  await writeTasks(filtered);
  return true;
}

// ============ AGENT-SPECIFIC TASK OPERATIONS ============

export async function getTasksByAgent(agentId: AgentId): Promise<Task[]> {
  const tasks = await readTasks();
  return tasks
    .filter((t) => t.assignee === agentId)
    .sort((a, b) => {
      // Sort by priority desc then createdAt desc
      const priorityOrder: Record<string, number> = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      const pDiff =
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function pickTask(
  taskId: string,
  agentId: AgentId,
): Promise<Task | null> {
  const tasks = await readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const workLogEntry: WorkLogEntry = {
    id: uuidv4(),
    agent: agentId,
    action: "picked",
    note: `${agentId} picked up this task`,
    createdAt: now,
  };

  tasks[index].status = "in_progress";
  tasks[index].assignee = agentId;
  tasks[index].updatedAt = now;
  tasks[index].workLog.push(workLogEntry);

  await writeTasks(tasks);

  // Update agent status
  await updateAgent(agentId, { status: "working", currentTask: taskId });

  return tasks[index];
}

export async function logWork(
  taskId: string,
  agentId: AgentId,
  action: "progress" | "blocked",
  note: string,
): Promise<Task | null> {
  const tasks = await readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const workLogEntry: WorkLogEntry = {
    id: uuidv4(),
    agent: agentId,
    action,
    note,
    createdAt: now,
  };

  tasks[index].updatedAt = now;
  tasks[index].workLog.push(workLogEntry);

  await writeTasks(tasks);
  return tasks[index];
}

export async function completeTask(
  taskId: string,
  agentId: AgentId,
  note?: string,
  deliverables?: string[],
  deliverable?: string,
): Promise<Task | null> {
  const tasks = await readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const workLogEntry: WorkLogEntry = {
    id: uuidv4(),
    agent: agentId,
    action: "completed",
    note: note || `${agentId} completed this task`,
    createdAt: now,
  };

  tasks[index].status = "review";
  (tasks[index] as any).reviewStatus = (tasks[index] as any).reviewStatus || 'pending';
  tasks[index].updatedAt = now;
  tasks[index].workLog.push(workLogEntry);

  // Handle deliverables array (new format)
  if (deliverables && deliverables.length > 0) {
    const existingDeliverables = tasks[index].deliverables || [];
    tasks[index].deliverables = Array.from(
      new Set([...existingDeliverables, ...deliverables]),
    );
  }

  // Handle single deliverable (backward compatibility)
  if (deliverable) {
    tasks[index].deliverable = deliverable;
    const existingDeliverables = tasks[index].deliverables || [];
    if (!existingDeliverables.includes(deliverable)) {
      tasks[index].deliverables = [deliverable, ...existingDeliverables];
    }
  }

  await writeTasks(tasks);

  // Update agent status
  await updateAgent(agentId, { status: "active", currentTask: null });

  return tasks[index];
}

export async function addComment(
  taskId: string,
  author: string,
  content: string,
): Promise<Task | null> {
  const tasks = await readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const comment: Comment = {
    id: uuidv4(),
    author,
    content,
    createdAt: now,
  };

  tasks[index].updatedAt = now;
  tasks[index].comments.push(comment);

  await writeTasks(tasks);
  return tasks[index];
}

export async function addCommentWithId(
  taskId: string,
  author: string,
  content: string,
): Promise<{ task: Task; commentId: string } | null> {
  const tasks = await readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const commentId = uuidv4();
  const comment: Comment = {
    id: commentId,
    author,
    content,
    createdAt: now,
  };

  tasks[index].updatedAt = now;
  tasks[index].comments.push(comment);

  await writeTasks(tasks);
  return { task: tasks[index], commentId };
}

// ============ MENTIONS OPERATIONS ============

export function parseMentions(text: string): AgentId[] {
  const validAgents: AgentId[] = AGENT_CONFIG.agents.map((a) => a.id);
  const regex = /@(\w+)/g;
  const mentions: AgentId[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const agent = match[1].toLowerCase() as AgentId;
    if (validAgents.includes(agent) && !mentions.includes(agent)) {
      mentions.push(agent);
    }
  }

  return mentions;
}

export async function createMention(data: {
  taskId: string;
  taskTitle: string;
  commentId: string;
  author: string;
  mentionedAgent: AgentId;
  content: string;
}): Promise<Mention> {
  const now = new Date().toISOString();
  const mention: Mention = {
    id: uuidv4(),
    taskId: data.taskId,
    taskTitle: data.taskTitle,
    commentId: data.commentId,
    author: data.author,
    mentionedAgent: data.mentionedAgent,
    content: data.content,
    createdAt: now,
    read: false,
  };

  const mentions = await readMentions();
  mentions.push(mention);
  await writeMentions(mentions);

  return mention;
}

export async function getMentionsForAgent(
  agentId: AgentId,
  unreadOnly: boolean = true,
): Promise<Mention[]> {
  let mentions = await readMentions();
  mentions = mentions.filter((m) => m.mentionedAgent === agentId);

  if (unreadOnly) {
    mentions = mentions.filter((m) => !m.read);
  }

  // Sort by createdAt descending
  mentions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return mentions;
}

export async function markMentionsRead(mentionIds: string[]): Promise<void> {
  const mentions = await readMentions();
  const idSet = new Set(mentionIds);

  for (const mention of mentions) {
    if (idSet.has(mention.id)) {
      mention.read = true;
    }
  }

  await writeMentions(mentions);
}

export async function markAllMentionsRead(agentId: AgentId): Promise<void> {
  const mentions = await readMentions();

  for (const mention of mentions) {
    if (mention.mentionedAgent === agentId && !mention.read) {
      mention.read = true;
    }
  }

  await writeMentions(mentions);
}

// ============ AGENT OPERATIONS ============

export async function getAgents(): Promise<Agent[]> {
  return readAgents();
}

export async function getAgent(id: AgentId): Promise<Agent | null> {
  const agents = await readAgents();
  return agents.find((a) => a.id === id) || null;
}

export async function updateAgent(
  id: AgentId,
  data: Partial<{
    status: AgentStatus;
    currentTask: string | null;
  }>,
): Promise<Agent | null> {
  const agents = await readAgents();
  const index = agents.findIndex((a) => a.id === id);
  if (index === -1) return null;

  Object.assign(agents[index], data);
  agents[index].lastSeen = new Date().toISOString();

  await writeAgents(agents);
  return agents[index];
}

// ============ REAL-TIME LISTENERS (polling-based) ============

export function subscribeToTasks(
  callback: (tasks: Task[]) => void,
): () => void {
  let running = true;

  const poll = async () => {
    while (running) {
      try {
        const tasks = await readTasks();
        tasks.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        callback(tasks);
      } catch (err) {
        console.error("Error polling tasks:", err);
      }
      // Poll every 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  poll();

  return () => {
    running = false;
  };
}

export function subscribeToAgents(
  callback: (agents: Agent[]) => void,
): () => void {
  let running = true;

  const poll = async () => {
    while (running) {
      try {
        const agents = await readAgents();
        callback(agents);
      } catch (err) {
        console.error("Error polling agents:", err);
      }
      // Poll every 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  poll();

  return () => {
    running = false;
  };
}

// ============ SEED DATA ============

export async function seedAgents(): Promise<void> {
  const existingAgents = await readAgents();
  const byId = new Map(existingAgents.map((a) => [a.id, a] as const));

  let changed = false;
  const now = new Date().toISOString();

  for (const agent of AGENT_CONFIG.agents) {
    const existing = byId.get(agent.id);

    if (!existing) {
      const agentData: Agent = {
        ...agent,
        status: 'active' as AgentStatus,
        currentTask: null,
        lastSeen: now,
      };
      existingAgents.push(agentData);
      byId.set(agent.id, agentData);
      changed = true;
      continue;
    }

    // Keep runtime fields (status/currentTask/lastSeen), but sync identity fields
    const before = {
      name: existing.name,
      emoji: existing.emoji,
      role: existing.role,
      focus: existing.focus,
    };

    existing.name = agent.name;
    existing.emoji = agent.emoji;
    existing.role = agent.role;
    existing.focus = agent.focus;

    const after = {
      name: existing.name,
      emoji: existing.emoji,
      role: existing.role,
      focus: existing.focus,
    };

    if (
      before.name !== after.name ||
      before.emoji !== after.emoji ||
      before.role !== after.role ||
      before.focus !== after.focus
    ) {
      changed = true;
    }
  }

  if (changed) {
    await writeAgents(existingAgents);
  }
}
