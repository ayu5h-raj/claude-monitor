import { describe, it, expect } from "vitest";
import { extractTodos } from "../lib/todos";
import type { SessionEntry } from "../lib/types";

function todoWriteEntry(
  todos: Array<{ content: string; status: string; activeForm?: string }>,
  ts: string,
): SessionEntry {
  return {
    type: "tool_use",
    timestamp: new Date(ts),
    content: "",
    toolName: "TodoWrite",
    toolInput: { todos },
    uuid: `tw-${ts}`,
  };
}

function taskCreateEntry(
  subject: string,
  description: string,
  ts: string,
  activeForm?: string,
): SessionEntry {
  return {
    type: "tool_use",
    timestamp: new Date(ts),
    content: "",
    toolName: "TaskCreate",
    toolInput: { subject, description, activeForm },
    uuid: `tc-${ts}`,
  };
}

function taskUpdateEntry(
  taskId: string | number,
  status: string,
  ts: string,
): SessionEntry {
  return {
    type: "tool_use",
    timestamp: new Date(ts),
    content: "",
    toolName: "TaskUpdate",
    toolInput: { taskId, status },
    uuid: `tu-${ts}`,
  };
}

describe("extractTodos", () => {
  it("returns empty summary when there are no entries", () => {
    const result = extractTodos([]);
    expect(result.todos).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.source).toBe("none");
  });

  it("uses the latest TodoWrite call as the source of truth", () => {
    const entries: SessionEntry[] = [
      todoWriteEntry(
        [{ content: "step 1", status: "pending" }],
        "2026-05-08T10:00:00Z",
      ),
      todoWriteEntry(
        [
          { content: "step 1", status: "completed", activeForm: "Doing step 1" },
          { content: "step 2", status: "in_progress", activeForm: "Doing step 2" },
        ],
        "2026-05-08T10:01:00Z",
      ),
    ];
    const result = extractTodos(entries);
    expect(result.source).toBe("TodoWrite");
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.inProgress).toBe(1);
    expect(result.todos[0]).toEqual({
      label: "step 1",
      status: "completed",
      hint: "Doing step 1",
    });
  });

  it("normalizes unknown statuses to pending", () => {
    const entries: SessionEntry[] = [
      todoWriteEntry(
        [{ content: "x", status: "weird-status" }],
        "2026-05-08T10:00:00Z",
      ),
    ];
    const result = extractTodos(entries);
    expect(result.todos[0].status).toBe("pending");
  });

  it("reconstructs todos from TaskCreate + TaskUpdate sequence", () => {
    const entries: SessionEntry[] = [
      taskCreateEntry("Plan auth refactor", "design new flow", "2026-05-08T10:00:00Z", "Planning auth refactor"),
      taskCreateEntry("Implement migration", "write up/down", "2026-05-08T10:01:00Z"),
      taskCreateEntry("Update docs", "README + CHANGELOG", "2026-05-08T10:02:00Z"),
      taskUpdateEntry("1", "completed", "2026-05-08T10:03:00Z"),
      taskUpdateEntry(2, "in_progress", "2026-05-08T10:04:00Z"),
    ];
    const result = extractTodos(entries);
    expect(result.source).toBe("TaskCreate");
    expect(result.total).toBe(3);
    expect(result.completed).toBe(1);
    expect(result.inProgress).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.todos[0]).toEqual({
      label: "Plan auth refactor",
      status: "completed",
      hint: "Planning auth refactor",
    });
    expect(result.todos[1].status).toBe("in_progress");
    expect(result.todos[2].status).toBe("pending");
  });

  it("falls back to description as hint when activeForm is missing", () => {
    const entries: SessionEntry[] = [
      taskCreateEntry("Cleanup", "remove unused imports", "2026-05-08T10:00:00Z"),
    ];
    const result = extractTodos(entries);
    expect(result.todos[0].hint).toBe("remove unused imports");
  });

  it("ignores TaskUpdate with out-of-range taskId", () => {
    const entries: SessionEntry[] = [
      taskCreateEntry("only task", "x", "2026-05-08T10:00:00Z"),
      taskUpdateEntry("99", "completed", "2026-05-08T10:01:00Z"),
    ];
    const result = extractTodos(entries);
    expect(result.todos[0].status).toBe("pending");
  });

  it("prefers TodoWrite over TaskCreate when both exist", () => {
    const entries: SessionEntry[] = [
      taskCreateEntry("legacy task", "x", "2026-05-08T10:00:00Z"),
      todoWriteEntry(
        [{ content: "modern todo", status: "pending" }],
        "2026-05-08T10:01:00Z",
      ),
    ];
    const result = extractTodos(entries);
    expect(result.source).toBe("TodoWrite");
    expect(result.todos[0].label).toBe("modern todo");
  });

  it("ignores TodoWrite calls with non-array input", () => {
    const entries: SessionEntry[] = [
      {
        type: "tool_use",
        timestamp: new Date("2026-05-08T10:00:00Z"),
        content: "",
        toolName: "TodoWrite",
        toolInput: { todos: "not-an-array" },
        uuid: "x",
      },
    ];
    const result = extractTodos(entries);
    expect(result.source).toBe("none");
  });

  it("filters out items with empty content", () => {
    const entries: SessionEntry[] = [
      todoWriteEntry(
        [
          { content: "valid", status: "completed" },
          { content: "", status: "pending" },
        ],
        "2026-05-08T10:00:00Z",
      ),
    ];
    const result = extractTodos(entries);
    expect(result.total).toBe(1);
  });
});
