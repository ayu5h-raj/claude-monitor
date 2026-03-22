import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  parseJSONLContent,
  mapRawEntriesToSessionEntries,
  extractSessionMetadata,
  extractFilesChanged,
  extractToolStats,
} from "@/lib/jsonl-parser";

const fixturePath = path.join(__dirname, "fixtures", "simple-session.jsonl");
const fixtureContent = readFileSync(fixturePath, "utf-8");

describe("parseJSONLContent", () => {
  it("parses valid JSONL lines", () => {
    const entries = parseJSONLContent(fixtureContent);
    expect(entries).toHaveLength(5);
  });

  it("skips empty lines", () => {
    const content = fixtureContent + "\n\n";
    const entries = parseJSONLContent(content);
    expect(entries).toHaveLength(5);
  });

  it("skips malformed lines without throwing", () => {
    const content = fixtureContent + "\n{invalid json}\n";
    const entries = parseJSONLContent(content);
    expect(entries).toHaveLength(5);
  });
});

describe("mapRawEntriesToSessionEntries", () => {
  it("filters out progress entries", () => {
    const raw = parseJSONLContent(fixtureContent);
    const entries = mapRawEntriesToSessionEntries(raw);
    const types = entries.map((e) => e.type);
    expect(types).not.toContain("progress");
  });

  it("maps user messages", () => {
    const raw = parseJSONLContent(fixtureContent);
    const entries = mapRawEntriesToSessionEntries(raw);
    const userEntries = entries.filter((e) => e.type === "user");
    expect(userEntries).toHaveLength(1);
    expect(userEntries[0].content).toBe("fix the login bug");
  });

  it("maps assistant text messages", () => {
    const raw = parseJSONLContent(fixtureContent);
    const entries = mapRawEntriesToSessionEntries(raw);
    const assistantEntries = entries.filter((e) => e.type === "assistant");
    expect(assistantEntries.length).toBeGreaterThanOrEqual(1);
    expect(assistantEntries[0].model).toBe("claude-opus-4-6");
  });

  it("maps tool_use entries from assistant content blocks", () => {
    const raw = parseJSONLContent(fixtureContent);
    const entries = mapRawEntriesToSessionEntries(raw);
    const toolUseEntries = entries.filter((e) => e.type === "tool_use");
    expect(toolUseEntries).toHaveLength(1);
    expect(toolUseEntries[0].toolName).toBe("Grep");
    expect(toolUseEntries[0].toolInput).toEqual({ pattern: "login", path: "src/" });
  });

  it("maps tool_result entries from user content blocks", () => {
    const raw = parseJSONLContent(fixtureContent);
    const entries = mapRawEntriesToSessionEntries(raw);
    const toolResultEntries = entries.filter((e) => e.type === "tool_result");
    expect(toolResultEntries).toHaveLength(1);
    expect(toolResultEntries[0].content).toContain("handleLogin()");
    expect(toolResultEntries[0].isError).toBe(false);
  });
});

describe("extractSessionMetadata", () => {
  it("extracts session metadata from raw entries", () => {
    const raw = parseJSONLContent(fixtureContent);
    const meta = extractSessionMetadata(raw, "sess-001");

    expect(meta.id).toBe("sess-001");
    expect(meta.project).toBe("web-app");
    expect(meta.projectPath).toBe("/Users/dev/github/web-app");
    expect(meta.branch).toBe("main");
    expect(meta.messageCount).toBe(3); // 1 user + 2 assistant
    expect(meta.toolCallCount).toBe(1);
    expect(meta.model).toBe("claude-opus-4-6");
    expect(meta.tokenUsage.input).toBe(2500);
    expect(meta.tokenUsage.output).toBe(500);
  });

  it("computes startedAt from first entry timestamp", () => {
    const raw = parseJSONLContent(fixtureContent);
    const meta = extractSessionMetadata(raw, "sess-001");
    expect(meta.startedAt).toEqual(new Date("2026-03-20T10:00:00.000Z"));
  });

  it("computes lastActiveAt from last entry timestamp", () => {
    const raw = parseJSONLContent(fixtureContent);
    const meta = extractSessionMetadata(raw, "sess-001");
    expect(meta.lastActiveAt).toEqual(new Date("2026-03-20T10:00:20.000Z"));
  });

  it("extracts contextSize from last assistant message input_tokens", () => {
    const raw = parseJSONLContent(fixtureContent);
    const meta = extractSessionMetadata(raw, "sess-001");
    // Fixture has two assistant messages: input_tokens 1000, then 1500
    expect(meta.contextSize).toBe(1500);
  });

  it("returns contextSize 0 when no assistant messages exist", () => {
    const raw = parseJSONLContent(
      '{"type":"user","message":{"role":"user","content":"hello"},"uuid":"u1","timestamp":"2026-03-20T10:00:00.000Z","cwd":"/x","sessionId":"s1","version":"2.1.81","gitBranch":"main"}'
    );
    const meta = extractSessionMetadata(raw, "s1");
    expect(meta.contextSize).toBe(0);
  });
});

describe("extractFilesChanged", () => {
  it("extracts file paths from Edit and Write tool_use entries", () => {
    const rawWithFiles = parseJSONLContent(
      fixtureContent +
        '\n{"type":"assistant","message":{"role":"assistant","model":"claude-opus-4-6","content":[{"type":"tool_use","id":"tool-edit","name":"Edit","input":{"file_path":"/src/auth/login.ts","old_string":"foo","new_string":"bar"}}],"usage":{"input_tokens":100,"output_tokens":50}},"uuid":"aaa-010","timestamp":"2026-03-20T10:01:00.000Z","cwd":"/Users/dev/github/web-app","sessionId":"sess-001","version":"2.1.81","gitBranch":"main"}' +
        '\n{"type":"assistant","message":{"role":"assistant","model":"claude-opus-4-6","content":[{"type":"tool_use","id":"tool-write","name":"Write","input":{"file_path":"/src/config.ts","content":"export default {}"}}],"usage":{"input_tokens":100,"output_tokens":50}},"uuid":"aaa-011","timestamp":"2026-03-20T10:01:05.000Z","cwd":"/Users/dev/github/web-app","sessionId":"sess-001","version":"2.1.81","gitBranch":"main"}'
    );
    const files = extractFilesChanged(rawWithFiles);
    expect(files).toContain("/src/auth/login.ts");
    expect(files).toContain("/src/config.ts");
    expect(files).toHaveLength(2);
  });

  it("deduplicates file paths", () => {
    const rawWithDupes = parseJSONLContent(
      '{"type":"assistant","message":{"role":"assistant","model":"claude-opus-4-6","content":[{"type":"tool_use","id":"t1","name":"Edit","input":{"file_path":"/src/app.ts","old_string":"a","new_string":"b"}}],"usage":{"input_tokens":10,"output_tokens":5}},"uuid":"d1","timestamp":"2026-03-20T10:00:00.000Z","cwd":"/x","sessionId":"s1","version":"2.1.81","gitBranch":"main"}' +
        '\n{"type":"assistant","message":{"role":"assistant","model":"claude-opus-4-6","content":[{"type":"tool_use","id":"t2","name":"Edit","input":{"file_path":"/src/app.ts","old_string":"b","new_string":"c"}}],"usage":{"input_tokens":10,"output_tokens":5}},"uuid":"d2","timestamp":"2026-03-20T10:00:05.000Z","cwd":"/x","sessionId":"s1","version":"2.1.81","gitBranch":"main"}'
    );
    const files = extractFilesChanged(rawWithDupes);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe("/src/app.ts");
  });

  it("ignores non-Edit/Write tool calls", () => {
    const raw = parseJSONLContent(fixtureContent); // only has Grep
    const files = extractFilesChanged(raw);
    expect(files).toHaveLength(0);
  });
});

describe("extractToolStats", () => {
  it("counts tool calls by name from fixture", () => {
    const raw = parseJSONLContent(fixtureContent);
    const stats = extractToolStats(raw);
    expect(stats["Grep"]).toBeDefined();
    expect(stats["Grep"].calls).toBe(1);
    expect(stats["Grep"].errors).toBe(0);
  });

  it("counts errors from tool_result with is_error", () => {
    const rawWithError = parseJSONLContent(
      '{"type":"assistant","message":{"role":"assistant","model":"claude-opus-4-6","content":[{"type":"tool_use","id":"err-tool-1","name":"Bash","input":{"command":"bad-cmd"}}],"usage":{"input_tokens":10,"output_tokens":5}},"uuid":"e1","timestamp":"2026-03-20T10:00:00.000Z","cwd":"/x","sessionId":"s1","version":"2.1.81","gitBranch":"main"}' +
      '\n{"type":"user","message":{"role":"user","content":[{"tool_use_id":"err-tool-1","type":"tool_result","content":"command not found","is_error":true}]},"uuid":"e2","timestamp":"2026-03-20T10:00:01.000Z","cwd":"/x","sessionId":"s1","version":"2.1.81","gitBranch":"main"}'
    );
    const stats = extractToolStats(rawWithError);
    expect(stats["Bash"].calls).toBe(1);
    expect(stats["Bash"].errors).toBe(1);
  });
});
