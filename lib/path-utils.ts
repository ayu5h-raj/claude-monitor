export type ToolKind = "skill" | "mcp" | "agent" | "tool";

export interface ToolDisplay {
  /** Badge text is derived as kind.toUpperCase() — SKILL / MCP / AGENT / TOOL */
  kind: ToolKind;
  label: string;
  detail?: string;
}

// Mirrors colorForTool() in session-analytics.tsx so the conversation stream and
// the Analytics tab agree: skills and subagents purple, MCP cyan, rest amber.
const KIND_COLORS: Record<ToolKind, string> = {
  skill: "var(--purple)",
  agent: "var(--purple)",
  mcp: "var(--cyan)",
  tool: "var(--amber)",
};

export function toolKindColor(kind: ToolKind): string {
  return KIND_COLORS[kind];
}

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Classifies a tool call for display. Skill invocations, MCP/plugin calls and
 * subagent spawns all arrive as plain tool_use entries; this pulls out what
 * distinguishes them. Anything unrecognised or malformed falls back to a
 * generic tool row rather than rendering undefined.
 */
export function classifyToolCall(
  toolName: string,
  toolInput?: Record<string, unknown>,
): ToolDisplay {
  if (toolName.startsWith("mcp__")) {
    // mcp__<server>__<tool>; tool may contain further "__" segments
    const [, server, ...rest] = toolName.split("__");
    if (server) {
      return { kind: "mcp", label: server, detail: rest.join("__") || undefined };
    }
  }

  if (toolName === "Skill") {
    const skill = trimmed(toolInput?.skill);
    if (skill) return { kind: "skill", label: skill, detail: trimmed(toolInput?.args) };
  }

  if (toolName === "Agent") {
    // subagent_type is absent on ~29% of calls; the tool defaults to general-purpose
    const type = trimmed(toolInput?.subagent_type) ?? "general-purpose";
    return { kind: "agent", label: type, detail: trimmed(toolInput?.description) };
  }

  return { kind: "tool", label: toolName };
}

/**
 * True for entries that are conversation text. Used by the chat-only view in
 * both the static list and the live stream. No empty-content guard needed:
 * jsonl-parser only pushes an assistant entry when textParts is non-empty.
 */
export function isChatEntry(entry: { type: string }): boolean {
  return entry.type === "user" || entry.type === "assistant";
}

export function extractRepoName(cwd: string): string {
  const cleaned = cwd.endsWith("/") ? cwd.slice(0, -1) : cwd;
  const segments = cleaned.split("/");
  return segments[segments.length - 1] || "unknown";
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${count}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}