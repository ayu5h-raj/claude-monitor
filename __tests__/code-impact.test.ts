import { describe, it, expect } from "vitest";
import { extractCodeImpact } from "../lib/code-impact";
import type { RawJSONLEntry } from "../lib/types";

function makeToolUseEntry(
  name: string,
  input: Record<string, unknown>
): RawJSONLEntry {
  return {
    type: "assistant",
    timestamp: "2025-01-01T00:00:00Z",
    message: {
      role: "assistant",
      content: [{ type: "tool_use", name, input, id: "tool-1" }],
    },
  };
}

describe("extractCodeImpact", () => {
  it("returns zero impact for empty entries", () => {
    const result = extractCodeImpact([]);
    expect(result.filesCreated).toBe(0);
    expect(result.filesModified).toBe(0);
    expect(result.filesDeleted).toBe(0);
    expect(result.totalEdits).toBe(0);
    expect(result.linesAdded).toBe(0);
    expect(result.linesRemoved).toBe(0);
    expect(result.impactScore).toBe(0);
    expect(result.allFiles).toEqual([]);
  });

  it("detects a single Write as created", () => {
    const entries = [
      makeToolUseEntry("Write", {
        file_path: "/src/config.ts",
        content: "export const x = 1;\n",
      }),
    ];
    const result = extractCodeImpact(entries);
    expect(result.filesCreated).toBe(1);
    expect(result.filesModified).toBe(0);
    expect(result.allFiles[0].changeType).toBe("created");
    expect(result.allFiles[0].createdContent).toBe("export const x = 1;\n");
  });

  it("detects a single Edit as modified", () => {
    const entries = [
      makeToolUseEntry("Edit", {
        file_path: "/src/app.ts",
        old_string: "const a = 1;",
        new_string: "const a = 2;",
      }),
    ];
    const result = extractCodeImpact(entries);
    expect(result.filesModified).toBe(1);
    expect(result.filesCreated).toBe(0);
    expect(result.allFiles[0].changeType).toBe("modified");
    expect(result.allFiles[0].edits).toHaveLength(1);
    expect(result.allFiles[0].edits[0].oldString).toBe("const a = 1;");
    expect(result.allFiles[0].edits[0].newString).toBe("const a = 2;");
  });

  it("accumulates multiple Edits on same file", () => {
    const entries = [
      makeToolUseEntry("Edit", {
        file_path: "/src/app.ts",
        old_string: "line1",
        new_string: "line1-updated",
      }),
      makeToolUseEntry("Edit", {
        file_path: "/src/app.ts",
        old_string: "line2",
        new_string: "line2-updated",
      }),
      makeToolUseEntry("Edit", {
        file_path: "/src/app.ts",
        old_string: "line3",
        new_string: "line3-updated",
      }),
    ];
    const result = extractCodeImpact(entries);
    expect(result.filesModified).toBe(1);
    expect(result.allFiles[0].edits).toHaveLength(3);
    expect(result.totalEdits).toBe(3);
  });

  it("treats Write followed by Edit as modified", () => {
    const entries = [
      makeToolUseEntry("Write", {
        file_path: "/src/new.ts",
        content: "initial content",
      }),
      makeToolUseEntry("Edit", {
        file_path: "/src/new.ts",
        old_string: "initial",
        new_string: "updated",
      }),
    ];
    const result = extractCodeImpact(entries);
    // Write+Edit = modified (not created, since it was further edited)
    expect(result.filesModified).toBe(1);
    expect(result.filesCreated).toBe(0);
    expect(result.allFiles[0].changeType).toBe("modified");
  });

  it("groups files by directory", () => {
    const entries = [
      makeToolUseEntry("Write", { file_path: "/src/auth/login.ts", content: "a" }),
      makeToolUseEntry("Write", { file_path: "/src/auth/signup.ts", content: "b" }),
      makeToolUseEntry("Write", { file_path: "/src/config.ts", content: "c" }),
    ];
    const result = extractCodeImpact(entries);
    expect(Object.keys(result.filesByDirectory)).toHaveLength(2);
    expect(result.filesByDirectory["/src/auth"]).toHaveLength(2);
    expect(result.filesByDirectory["/src"]).toHaveLength(1);
  });

  it("calculates impact score correctly", () => {
    const entries = [
      makeToolUseEntry("Write", { file_path: "/a.ts", content: "line1\nline2\nline3" }),
      makeToolUseEntry("Edit", {
        file_path: "/b.ts",
        old_string: "old",
        new_string: "new",
      }),
    ];
    const result = extractCodeImpact(entries);
    // 1 created (3pts) + 1 modified (2pts) + 1 edit (1pt) + lines/10
    // lines: created has 3 lines added, edit has 1 added + 1 removed = 5 total / 10 = 0.5
    expect(result.impactScore).toBe(Math.round(3 + 2 + 1 + 5 / 10));
  });

  it("truncates content at 2000 chars", () => {
    const longContent = "x".repeat(3000);
    const entries = [
      makeToolUseEntry("Write", { file_path: "/big.ts", content: longContent }),
    ];
    const result = extractCodeImpact(entries);
    expect(result.allFiles[0].createdContent!.length).toBeLessThan(2100);
    expect(result.allFiles[0].createdContent!).toContain("... (truncated)");
  });

  it("ignores non-Edit/Write tool_use blocks", () => {
    const entries = [
      makeToolUseEntry("Grep", { pattern: "test", path: "/src" }),
      makeToolUseEntry("Read", { file_path: "/src/app.ts" }),
      makeToolUseEntry("Bash", { command: "npm test" }),
    ];
    const result = extractCodeImpact(entries);
    expect(result.allFiles).toEqual([]);
    expect(result.impactScore).toBe(0);
  });

  it("counts lines added and removed", () => {
    const entries = [
      makeToolUseEntry("Edit", {
        file_path: "/src/app.ts",
        old_string: "line1\nline2\nline3",
        new_string: "new1\nnew2\nnew3\nnew4\nnew5",
      }),
    ];
    const result = extractCodeImpact(entries);
    expect(result.linesRemoved).toBe(3);
    expect(result.linesAdded).toBe(5);
  });

  it("skips entries without file_path", () => {
    const entries: RawJSONLEntry[] = [
      {
        type: "assistant",
        timestamp: "2025-01-01T00:00:00Z",
        message: {
          role: "assistant",
          content: [{ type: "tool_use", name: "Edit", input: { old_string: "a", new_string: "b" }, id: "t1" }],
        },
      },
    ];
    const result = extractCodeImpact(entries);
    expect(result.allFiles).toEqual([]);
  });

  it("handles Write → Write on same file as modified", () => {
    const entries = [
      makeToolUseEntry("Write", { file_path: "/src/app.ts", content: "v1" }),
      makeToolUseEntry("Write", { file_path: "/src/app.ts", content: "v2" }),
    ];
    const result = extractCodeImpact(entries);
    expect(result.filesModified).toBe(1);
    expect(result.filesCreated).toBe(0);
    expect(result.allFiles[0].changeType).toBe("modified");
    expect(result.allFiles[0].edits).toHaveLength(1);
  });
});
