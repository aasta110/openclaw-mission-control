import { NextRequest, NextResponse } from 'next/server';
import { addComment, createTask, getTasks, serializeTask, updateTask } from '@/lib/local-storage';
import { AgentId, TaskPriority, TaskStatus } from '@/lib/types';
import { AGENT_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

// GET /api/tasks - List all tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as TaskStatus | null;
    const assignee = searchParams.get('assignee') as AgentId | null;
    const priority = searchParams.get('priority') as TaskPriority | null;
    const parentId = searchParams.get('parentId');

    const filters: { status?: TaskStatus; assignee?: AgentId; priority?: TaskPriority } = {};
    if (status) filters.status = status;
    if (assignee) filters.assignee = assignee;
    if (priority) filters.priority = priority;

    // One-time migration behavior (idempotent):
    // If an Atlas mission (assignee=main) exists in BACKLOG and already has children,
    // auto-start it by moving parent + children to TODO.
    // This makes old missions behave like the new auto-start flow.
    const allTasks = await getTasks();
    const childrenByParent = new Map<string, number>();
    for (const t of allTasks) {
      if (t.parentId) {
        childrenByParent.set(t.parentId, (childrenByParent.get(t.parentId) || 0) + 1);
      }
    }

    let migrated = false;
    for (const t of allTasks) {
      const hasChildren = (childrenByParent.get(t.id) || 0) > 0;
      const isAtlasParent = (t.assignee || null) === 'main' && !t.parentId;
      const isBacklog = t.status === 'backlog';

      if (isAtlasParent && isBacklog && hasChildren) {
        await updateTask(t.id, { status: 'todo' });
        await addComment(
          t.id,
          'main',
          'Auto-start migration: this mission had existing subtasks; moved parent + children to TODO automatically.'
        );

        // Move only backlog children → todo (don’t override in_progress/review/done)
        for (const c of allTasks) {
          if (c.parentId === t.id && c.status === 'backlog') {
            await updateTask(c.id, { status: 'todo' });
          }
        }

        migrated = true;
      }
    }

    let tasks = await getTasks(Object.keys(filters).length > 0 ? filters : undefined);

    // If we migrated, reload the list to reflect updated statuses.
    if (migrated) {
      tasks = await getTasks(Object.keys(filters).length > 0 ? filters : undefined);
    }

    if (parentId !== null) {
      // parentId query supports:
      // - parentId=<uuid>  → only children of that parent
      // - parentId=none     → only top-level tasks (no parentId)
      if (parentId === 'none') {
        tasks = tasks.filter((t) => !t.parentId);
      } else {
        tasks = tasks.filter((t) => t.parentId === parentId);
      }
    }

    return NextResponse.json({
      success: true,
      tasks: tasks.map(serializeTask),
      count: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, assignee, createdBy, tags, dueDate } = body;

    if (!title || !description || !priority || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, description, priority, createdBy' },
        { status: 400 }
      );
    }

    // Validate priority
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority. Must be: low, medium, high, or urgent' },
        { status: 400 }
      );
    }

    const task = await createTask({
      title,
      description,
      priority,
      assignee: assignee || null,
      createdBy,
      tags: tags || [],
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    // Auto-split: if a task is assigned to Atlas (main coordinator), create subtasks for the rest of the team.
    // Auto-start: user requested that Mission Control starts automatically.
    if ((assignee || null) === 'main') {
      // Mark parent as TODO immediately.
      await updateTask(task.id, { status: 'todo' });

      await addComment(task.id, 'main',
        'Auto-split started. Subtasks created and moved to TODO automatically.'
      );

      // Auto-split must include ALL configured agents (except Atlas/main)
      const templates: Partial<Record<AgentId, { title: string; description: string }>> = {
        claude1: {
          title: 'Backend plan + interfaces',
          description: `Define backend/API plan for: ${title}.\n\nContext:\n${description}`,
        },
        claude2: {
          title: 'Frontend/UI plan + components',
          description: `Define UI/component plan for: ${title}.\n\nContext:\n${description}`,
        },
        claude3: {
          title: 'Security/DevOps checklist',
          description: `Threat model + deployment/security checklist for: ${title}.\n\nContext:\n${description}`,
        },
        tanel: {
          title: 'Project plan + acceptance criteria',
          description: `Break into milestones and acceptance criteria for: ${title}.\n\nContext:\n${description}`,
        },
        gpt4research: {
          title: 'Research/benchmarks',
          description: `Find references/inspiration and pitfalls for: ${title}.\n\nContext:\n${description}`,
        },
        gpt4writing: {
          title: 'Spec rewrite / crisp brief',
          description: `Rewrite into crisp brief + requirements for: ${title}.\n\nContext:\n${description}`,
        },
        gpt4ux: {
          title: 'UX flows + edge cases',
          description: `User flows + edge cases for: ${title}.\n\nContext:\n${description}`,
        },
        gpt4seo: {
          title: 'SEO considerations (if public)',
          description: `If this is public-facing, list SEO items for: ${title}.\n\nContext:\n${description}`,
        },
        gpt4data: {
          title: 'Analytics/telemetry events',
          description: `Define analytics/event tracking for: ${title}.\n\nContext:\n${description}`,
        },
        gpt4test: {
          title: 'Test plan',
          description: `Write test plan + verification checklist for: ${title}.\n\nContext:\n${description}`,
        },
        gpt4content: {
          title: 'Docs/changelog draft',
          description: `Draft initial docs/changelog notes for: ${title}.\n\nContext:\n${description}`,
        },
      };

      const children = AGENT_CONFIG.agents
        .map((a) => a.id as AgentId)
        .filter((id) => id !== 'main')
        .map((id) => {
          const tpl = templates[id];
          if (!tpl) {
            return {
              assignee: id,
              title: `${id} subtask`,
              description: `Work on your part for: ${title}.\n\nContext:\n${description}`,
            };
          }
          return { assignee: id, ...tpl };
        });

      for (const c of children) {
        const child = await createTask({
          title: c.title,
          description: c.description,
          priority,
          assignee: c.assignee,
          createdBy: 'main',
          tags: [...(tags || []), 'auto-split'],
          dueDate: dueDate ? new Date(dueDate) : undefined,
          parentId: task.id,
        });

        // Child tasks start in TODO automatically (auto-start).
        await updateTask(child.id, { status: 'todo' });
      }

      return NextResponse.json({
        success: true,
        task: serializeTask((await getTasks({}))?.find(t => t.id === task.id) || task),
        autoSplit: true,
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      task: serializeTask(task),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
