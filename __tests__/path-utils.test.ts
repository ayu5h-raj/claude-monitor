import { describe, it, expect } from "vitest";
import {
  extractRepoName,
  formatRelativeTime,
  formatTokenCount,
  classifyToolCall,
  isChatEntry,
  paginate,
} from "@/lib/path-utils";

describe("extractRepoName", () => {
  it("extracts repo name from simple path", () => {
    expect(extractRepoName("/Users/ayushraj/github/web-app")).toBe("web-app");
  });

  it("extracts repo name from nested path", () => {
    expect(extractRepoName("/Users/ayushraj/Documents/github/agents-session")).toBe("agents-session");
  });

  it("handles trailing slash", () => {
    expect(extractRepoName("/Users/ayushraj/github/web-app/")).toBe("web-app");
  });

  it("handles single segment", () => {
    expect(extractRepoName("/project")).toBe("project");
  });
});

describe("formatRelativeTime", () => {
  it("formats seconds ago", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 30 * 1000);
    expect(formatRelativeTime(date)).toBe("30s ago");
  });

  it("formats minutes ago", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("5m ago");
  });

  it("formats hours ago", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("3h ago");
  });

  it("formats days ago", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("2d ago");
  });
});

describe("formatTokenCount", () => {
  it("formats small numbers as-is", () => {
    expect(formatTokenCount(500)).toBe("500");
  });

  it("formats thousands with K", () => {
    expect(formatTokenCount(1500)).toBe("1.5K");
  });

  it("formats millions with M", () => {
    expect(formatTokenCount(2500000)).toBe("2.5M");
  });

  it("formats exact thousands", () => {
    expect(formatTokenCount(1000)).toBe("1.0K");
  });
});

describe("classifyToolCall", () => {
  it("splits an MCP name into server and tool", () => {
    expect(classifyToolCall("mcp__posthog__exec")).toEqual({
      kind: "mcp",
      label: "posthog",
      detail: "exec",
    });
  });

  it("keeps extra underscores in the MCP tool segment", () => {
    expect(classifyToolCall("mcp__chrome__tabs_close_mcp__v2").detail).toBe("tabs_close_mcp__v2");
  });

  it("reads the skill name and args", () => {
    expect(classifyToolCall("Skill", { skill: "claude-api", args: "pricing" })).toEqual({
      kind: "skill",
      label: "claude-api",
      detail: "pricing",
    });
  });

  it("reads the subagent type and description", () => {
    expect(classifyToolCall("Agent", { subagent_type: "Explore", description: "find callers" })).toEqual(
      { kind: "agent", label: "Explore", detail: "find callers" },
    );
  });

  it("defaults a subagent with no type to general-purpose", () => {
    // ~29% of real Agent calls omit subagent_type
    expect(classifyToolCall("Agent", { description: "x" }).label).toBe("general-purpose");
  });

  it("leaves ordinary tools generic", () => {
    expect(classifyToolCall("Bash", { command: "ls" })).toEqual({ kind: "tool", label: "Bash" });
  });

  // Malformed input must degrade to a generic row, never render undefined
  it("falls back when a Skill call has no skill name", () => {
    expect(classifyToolCall("Skill", {})).toEqual({ kind: "tool", label: "Skill" });
  });

  it("falls back on a bare mcp__ prefix with no server", () => {
    expect(classifyToolCall("mcp__")).toEqual({ kind: "tool", label: "mcp__" });
  });

  it("omits detail for an MCP name with no tool segment", () => {
    expect(classifyToolCall("mcp__foo")).toEqual({ kind: "mcp", label: "foo", detail: undefined });
  });

  it("handles a missing toolInput", () => {
    expect(classifyToolCall("Skill").kind).toBe("tool");
    expect(classifyToolCall("Agent").label).toBe("general-purpose");
  });

  it("ignores blank string fields", () => {
    expect(classifyToolCall("Skill", { skill: "   " }).kind).toBe("tool");
  });
});

describe("paginate", () => {
  it("returns the first page", () => {
    expect(paginate(7048, 1, 200)).toMatchObject({
      current: 1,
      start: 0,
      end: 200,
      from: 1,
      to: 200,
      hasNewer: false,
      hasOlder: true,
    });
  });

  it("returns a middle page", () => {
    expect(paginate(7048, 2, 200)).toMatchObject({ start: 200, end: 400, from: 201, to: 400 });
  });

  it("clamps a page past the end to the last page", () => {
    const p = paginate(450, 99, 200);
    expect(p).toMatchObject({ current: 3, start: 400, end: 450, to: 450, hasOlder: false });
  });

  it("clamps zero and negative pages to the first", () => {
    expect(paginate(450, 0, 200).current).toBe(1);
    expect(paginate(450, -5, 200).current).toBe(1);
  });

  it("handles an empty session", () => {
    expect(paginate(0, 1, 200)).toMatchObject({
      current: 1,
      from: 0,
      to: 0,
      hasNewer: false,
      hasOlder: false,
    });
  });

  it("handles a session that fits on one page", () => {
    expect(paginate(12, 1, 200)).toMatchObject({ to: 12, hasOlder: false, hasNewer: false });
  });
});

describe("isChatEntry", () => {
  it("keeps user and assistant entries", () => {
    expect(isChatEntry({ type: "user" })).toBe(true);
    expect(isChatEntry({ type: "assistant" })).toBe(true);
  });

  it("drops tool calls and their results", () => {
    expect(isChatEntry({ type: "tool_use" })).toBe(false);
    expect(isChatEntry({ type: "tool_result" })).toBe(false);
  });
});