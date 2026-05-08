import { describe, it, expect } from "vitest";
import { computeSessionAnalytics, type AnalyticsInput } from "../lib/session-analytics";
import type { SessionEntry, TokenUsage } from "../lib/types";

function assistantEntry(
  ts: string,
  usage: Partial<TokenUsage>,
  uuid = `a-${ts}`,
): SessionEntry {
  return {
    type: "assistant",
    timestamp: new Date(ts),
    content: "",
    model: "claude-opus-4-7",
    usage: {
      input: usage.input ?? 0,
      output: usage.output ?? 0,
      cacheRead: usage.cacheRead ?? 0,
      cacheCreation: usage.cacheCreation ?? 0,
    },
    uuid,
  };
}

function userEntry(ts: string): SessionEntry {
  return {
    type: "user",
    timestamp: new Date(ts),
    content: "hi",
    uuid: `u-${ts}`,
  };
}

function makeInput(overrides: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return {
    entries: [],
    toolStats: {},
    tokenUsage: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
    startedAt: "2026-05-08T10:00:00Z",
    lastActiveAt: "2026-05-08T10:30:00Z",
    messageCount: 0,
    toolCallCount: 0,
    model: "claude-opus-4-7",
    filesCreated: 0,
    filesModified: 0,
    filesDeleted: 0,
    ...overrides,
  };
}

describe("computeSessionAnalytics", () => {
  it("returns zero analytics for an empty session", () => {
    const result = computeSessionAnalytics(makeInput());
    expect(result.totalTokens).toBe(0);
    expect(result.cacheHitPercent).toBe(0);
    expect(result.toolBreakdown).toEqual([]);
    expect(result.activity).toEqual([]);
    expect(result.subagentCount).toBe(0);
    expect(result.longestGapMs).toBe(0);
  });

  it("ranks tool breakdown by calls descending", () => {
    const result = computeSessionAnalytics(
      makeInput({
        toolStats: {
          Edit: { calls: 5, errors: 0 },
          Bash: { calls: 12, errors: 1 },
          Read: { calls: 3, errors: 0 },
        },
      }),
    );
    expect(result.toolBreakdown.map((t) => t.name)).toEqual(["Bash", "Edit", "Read"]);
    expect(result.totalToolCalls).toBe(20);
    expect(result.totalToolErrors).toBe(1);
  });

  it("flags MCP tools and parses server name", () => {
    const result = computeSessionAnalytics(
      makeInput({
        toolStats: {
          mcp__context7__query_docs: { calls: 3, errors: 0 },
          Read: { calls: 1, errors: 0 },
        },
      }),
    );
    const mcp = result.toolBreakdown.find((t) => t.isMcp);
    expect(mcp?.mcpServer).toBe("context7");
    expect(mcp?.displayName).toContain("context7");
  });

  it("computes cache hit percent against total input", () => {
    const result = computeSessionAnalytics(
      makeInput({
        tokenUsage: { input: 100, cacheRead: 800, cacheCreation: 100, output: 50 },
      }),
    );
    // total input = 1000; cacheRead 800 -> 80%
    expect(result.cacheHitPercent).toBe(80);
  });

  it("counts Agent tool calls as subagents", () => {
    const result = computeSessionAnalytics(
      makeInput({
        toolStats: {
          Agent: { calls: 4, errors: 1 },
          TaskCreate: { calls: 7, errors: 0 },
          TaskUpdate: { calls: 11, errors: 0 },
        },
      }),
    );
    expect(result.subagentCount).toBe(4);
    expect(result.taskCreateCount).toBe(7);
    expect(result.taskUpdateCount).toBe(11);
  });

  it("builds activity timeline from assistant turns with usage", () => {
    const entries: SessionEntry[] = [
      userEntry("2026-05-08T10:00:00Z"),
      assistantEntry("2026-05-08T10:00:05Z", { input: 100, output: 50 }),
      assistantEntry("2026-05-08T10:00:10Z", { input: 200, output: 80, cacheRead: 50 }),
    ];
    const result = computeSessionAnalytics(makeInput({ entries }));
    expect(result.activity).toHaveLength(2);
    expect(result.activity[0]).toMatchObject({ index: 0, inputTokens: 100, outputTokens: 50 });
    expect(result.activity[1].inputTokens).toBe(250);
  });

  it("computes longest gap across consecutive entries", () => {
    const entries: SessionEntry[] = [
      userEntry("2026-05-08T10:00:00Z"),
      userEntry("2026-05-08T10:01:00Z"),
      userEntry("2026-05-08T10:11:00Z"),
      userEntry("2026-05-08T10:11:30Z"),
    ];
    const result = computeSessionAnalytics(makeInput({ entries }));
    expect(result.longestGapMs).toBe(10 * 60 * 1000);
  });

  it("estimates cost when the model is in the rate table", () => {
    const result = computeSessionAnalytics(
      makeInput({
        model: "claude-opus-4-7",
        tokenUsage: { input: 1_000_000, output: 0, cacheRead: 0, cacheCreation: 0 },
      }),
    );
    // 1M input tokens at $15 = $15
    expect(result.estimatedCostUSD).toBeCloseTo(15, 1);
  });

  it("returns undefined cost when the model is unknown", () => {
    const result = computeSessionAnalytics(
      makeInput({
        model: "totally-fake-model",
        tokenUsage: { input: 1_000_000, output: 0, cacheRead: 0, cacheCreation: 0 },
      }),
    );
    expect(result.estimatedCostUSD).toBeUndefined();
  });

  it("forwards file impact counts unchanged", () => {
    const result = computeSessionAnalytics(
      makeInput({ filesCreated: 3, filesModified: 7, filesDeleted: 1 }),
    );
    expect(result.filesCreated).toBe(3);
    expect(result.filesModified).toBe(7);
    expect(result.filesDeleted).toBe(1);
  });
});
