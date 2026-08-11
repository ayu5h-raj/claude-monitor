import type { SessionEntry } from "./types";

export type TodoStatus = "pending" | "in_progress" | "completed";

export interface Todo {
  label: string;
  status: TodoStatus;
  hint?: string;
}

export interface TodoSummary {
  todos: Todo[];
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  source: "TodoWrite" | "TaskCreate" | "none";
}

const KNOWN_STATUS = new Set<TodoStatus>(["pending", "in_progress", "completed"]);

function normalizeStatus(s: unknown): TodoStatus {
  return typeof s === "string" && KNOWN_STATUS.has(s as TodoStatus)
    ? (s as TodoStatus)
    : "pending";
}

function toMillis(ts: Date | string): number {
  return ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
}

interface RawTodoWriteItem {
  content?: unknown;
  status?: unknown;
  activeForm?: unknown;
}

export function extractTodos(entries: SessionEntry[]): TodoSummary {
  let latestTodoWrite: Todo[] | null = null;
  let latestTodoWriteTs = -Infinity;

  type ManagedTask = { label: string; status: TodoStatus; hint?: string };
  const taskOrder: ManagedTask[] = [];

  for (const entry of entries) {
    if (entry.type !== "tool_use" || !entry.toolInput) continue;
    const ts = toMillis(entry.timestamp);

    if (entry.toolName === "TodoWrite") {
      const raw = entry.toolInput.todos;
      if (Array.isArray(raw) && ts >= latestTodoWriteTs) {
        latestTodoWriteTs = ts;
        latestTodoWrite = (raw as RawTodoWriteItem[])
          .map((t) => ({
            label: typeof t?.content === "string" ? t.content : "",
            status: normalizeStatus(t?.status),
            hint:
              typeof t?.activeForm === "string" && t.activeForm
                ? t.activeForm
                : undefined,
          }))
          .filter((t) => t.label);
      }
      continue;
    }

    if (entry.toolName === "TaskCreate") {
      const subject =
        typeof entry.toolInput.subject === "string" ? entry.toolInput.subject : "";
      if (!subject) continue;
      const description =
        typeof entry.toolInput.description === "string"
          ? entry.toolInput.description
          : "";
      const activeForm =
        typeof entry.toolInput.activeForm === "string"
          ? entry.toolInput.activeForm
          : "";
      taskOrder.push({
        label: subject,
        status: "pending",
        hint: activeForm || description || undefined,
      });
      continue;
    }

    if (entry.toolName === "TaskUpdate") {
      const taskId = entry.toolInput.taskId;
      const idxRaw =
        typeof taskId === "string"
          ? parseInt(taskId, 10)
          : typeof taskId === "number"
            ? taskId
            : NaN;
      if (Number.isFinite(idxRaw)) {
        const idx = idxRaw - 1;
        if (idx >= 0 && idx < taskOrder.length) {
          taskOrder[idx].status = normalizeStatus(entry.toolInput.status);
        }
      }
    }
  }

  let todos: Todo[];
  let source: TodoSummary["source"];
  if (latestTodoWrite && latestTodoWrite.length > 0) {
    todos = latestTodoWrite;
    source = "TodoWrite";
  } else if (taskOrder.length > 0) {
    todos = taskOrder;
    source = "TaskCreate";
  } else {
    todos = [];
    source = "none";
  }

  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  for (const t of todos) {
    if (t.status === "completed") completed++;
    else if (t.status === "in_progress") inProgress++;
    else pending++;
  }

  return {
    todos,
    total: todos.length,
    completed,
    inProgress,
    pending,
    source,
  };
}
