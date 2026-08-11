import type { SessionEntry, TokenUsage } from "./types";

export interface ToolBreakdownItem {
  name: string;
  displayName: string;
  calls: number;
  errors: number;
  isMcp: boolean;
  mcpServer?: string;
}

export interface ActivityPoint {
  index: number;
  inputTokens: number;
  outputTokens: number;
  timestamp: string;
}

export interface SessionAnalytics {
  tokenUsage: TokenUsage;
  totalTokens: number;
  cacheHitPercent: number;
  estimatedCostUSD?: number;
  toolBreakdown: ToolBreakdownItem[];
  totalToolCalls: number;
  totalToolErrors: number;
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
  activity: ActivityPoint[];
  startedAt: string;
  lastActiveAt: string;
  durationMs: number;
  longestGapMs: number;
  messageCount: number;
  toolCallCount: number;
  subagentCount: number;
  taskCreateCount: number;
  taskUpdateCount: number;
  todoWriteCount: number;
  skillCount: number;
}

// USD per million tokens. Cache reads bill at 0.1x input, cache writes at 1.25x (5-min TTL).
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "claude-fable-5": { input: 10, output: 50 },
  "claude-mythos-5": { input: 10, output: 50 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-opus-4-5": { input: 15, output: 75 },
  "claude-opus-4": { input: 15, output: 75 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-haiku-4": { input: 1, output: 5 },
};

function estimateCost(usage: TokenUsage, model: string): number | undefined {
  // Longest key first so "claude-opus-4-8" doesn't fall through to "claude-opus-4"
  const key = Object.keys(COST_TABLE)
    .sort((a, b) => b.length - a.length)
    .find((k) => model.startsWith(k));
  if (!key) return undefined;
  const r = COST_TABLE[key];
  return (
    (usage.input / 1_000_000) * r.input +
    (usage.output / 1_000_000) * r.output +
    (usage.cacheRead / 1_000_000) * r.input * 0.1 +
    (usage.cacheCreation / 1_000_000) * r.input * 1.25
  );
}

function toMillis(ts: Date | string): number {
  return ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
}

function toIso(ts: Date | string): string {
  return ts instanceof Date ? ts.toISOString() : ts;
}

function parseMcpName(name: string): { isMcp: boolean; server?: string; tool?: string } {
  if (!name.startsWith("mcp__")) return { isMcp: false };
  const parts = name.split("__");
  return {
    isMcp: true,
    server: parts[1] || undefined,
    tool: parts.slice(2).join("__") || undefined,
  };
}

export interface AnalyticsInput {
  entries: SessionEntry[];
  toolStats: Record<string, { calls: number; errors: number }>;
  tokenUsage: TokenUsage;
  startedAt: Date | string;
  lastActiveAt: Date | string;
  messageCount: number;
  toolCallCount: number;
  model: string;
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
}

export function computeSessionAnalytics(input: AnalyticsInput): SessionAnalytics {
  const toolBreakdown: ToolBreakdownItem[] = [];
  for (const [name, stats] of Object.entries(input.toolStats || {})) {
    const mcp = parseMcpName(name);
    toolBreakdown.push({
      name,
      displayName: mcp.isMcp && mcp.server ? `${mcp.server} · ${mcp.tool ?? "?"}` : name,
      calls: stats.calls,
      errors: stats.errors,
      isMcp: mcp.isMcp,
      mcpServer: mcp.server,
    });
  }
  toolBreakdown.sort((a, b) => b.calls - a.calls);

  const totalToolCalls = toolBreakdown.reduce((s, t) => s + t.calls, 0);
  const totalToolErrors = toolBreakdown.reduce((s, t) => s + t.errors, 0);

  const totalInputAll =
    input.tokenUsage.input + input.tokenUsage.cacheRead + input.tokenUsage.cacheCreation;
  const totalTokens = totalInputAll + input.tokenUsage.output;
  const cacheHitPercent =
    totalInputAll > 0
      ? Math.round((input.tokenUsage.cacheRead / totalInputAll) * 100)
      : 0;

  const activity: ActivityPoint[] = [];
  let assistantTurn = 0;
  let prevTs: number | null = null;
  let longestGap = 0;

  for (const entry of input.entries) {
    const ts = toMillis(entry.timestamp);
    if (prevTs !== null) {
      const gap = ts - prevTs;
      if (gap > longestGap) longestGap = gap;
    }
    prevTs = ts;

    if (entry.type === "assistant" && entry.usage) {
      activity.push({
        index: assistantTurn++,
        inputTokens:
          entry.usage.input + entry.usage.cacheRead + entry.usage.cacheCreation,
        outputTokens: entry.usage.output,
        timestamp: toIso(entry.timestamp),
      });
    }
  }

  const startedAt = toIso(input.startedAt);
  const lastActiveAt = toIso(input.lastActiveAt);
  const durationMs =
    new Date(lastActiveAt).getTime() - new Date(startedAt).getTime();

  return {
    tokenUsage: input.tokenUsage,
    totalTokens,
    cacheHitPercent,
    estimatedCostUSD: estimateCost(input.tokenUsage, input.model),
    toolBreakdown,
    totalToolCalls,
    totalToolErrors,
    filesCreated: input.filesCreated,
    filesModified: input.filesModified,
    filesDeleted: input.filesDeleted,
    activity,
    startedAt,
    lastActiveAt,
    durationMs: Math.max(0, durationMs),
    longestGapMs: longestGap,
    messageCount: input.messageCount,
    toolCallCount: input.toolCallCount,
    subagentCount: input.toolStats["Agent"]?.calls ?? 0,
    taskCreateCount: input.toolStats["TaskCreate"]?.calls ?? 0,
    taskUpdateCount: input.toolStats["TaskUpdate"]?.calls ?? 0,
    todoWriteCount: input.toolStats["TodoWrite"]?.calls ?? 0,
    skillCount: input.toolStats["Skill"]?.calls ?? 0,
  };
}
