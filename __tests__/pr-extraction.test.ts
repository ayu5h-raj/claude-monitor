import { describe, it, expect } from "vitest";
import { extractPRs, parsePRUrl, PR_URL_RE } from "../src/components/async-pr-links";
import type { SessionEntry } from "../lib/types";

function makeEntry(overrides: Partial<SessionEntry> = {}): SessionEntry {
  return {
    type: "assistant",
    timestamp: new Date(),
    content: "",
    uuid: "test-uuid",
    ...overrides,
  };
}

describe("PR_URL_RE", () => {
  it("matches standard github.com PR URLs", () => {
    const url = "https://github.com/owner/repo/pull/123";
    expect(url.match(PR_URL_RE)).toEqual([url]);
  });

  it("matches self-hosted git domains", () => {
    const url = "https://git.zoominfo.com/DoubleO-ai/doubleo-server/pull/11636";
    expect(url.match(PR_URL_RE)).toEqual([url]);
  });

  it("matches GitHub Enterprise URLs", () => {
    const url = "https://github.mycompany.com/team/project/pull/42";
    expect(url.match(PR_URL_RE)).toEqual([url]);
  });

  it("matches http (non-TLS) URLs", () => {
    const url = "http://git.internal/org/repo/pull/99";
    expect(url.match(PR_URL_RE)).toEqual([url]);
  });

  it("does not match non-PR paths", () => {
    expect("https://github.com/owner/repo/issues/123".match(PR_URL_RE)).toBeNull();
  });

  it("does not match URLs without a PR number", () => {
    expect("https://github.com/owner/repo/pull/".match(PR_URL_RE)).toBeNull();
  });
});

describe("extractPRs", () => {
  it("extracts PR URLs from entry content", () => {
    const entries = [
      makeEntry({ content: "Created https://github.com/org/repo/pull/1" }),
    ];
    expect(extractPRs(entries)).toEqual(["https://github.com/org/repo/pull/1"]);
  });

  it("extracts PR URLs from toolResult", () => {
    const entries = [
      makeEntry({ toolResult: "PR created: https://github.com/org/repo/pull/5" }),
    ];
    expect(extractPRs(entries)).toEqual(["https://github.com/org/repo/pull/5"]);
  });

  it("extracts self-hosted PR URLs from content", () => {
    const entries = [
      makeEntry({
        content: "PR link: https://git.zoominfo.com/DoubleO-ai/doubleo-server/pull/11636",
      }),
    ];
    expect(extractPRs(entries)).toEqual([
      "https://git.zoominfo.com/DoubleO-ai/doubleo-server/pull/11636",
    ]);
  });

  it("extracts self-hosted PR URLs from toolResult", () => {
    const entries = [
      makeEntry({
        toolResult: "https://git.zoominfo.com/DoubleO-ai/doubleo-server/pull/11636",
      }),
    ];
    expect(extractPRs(entries)).toEqual([
      "https://git.zoominfo.com/DoubleO-ai/doubleo-server/pull/11636",
    ]);
  });

  it("deduplicates identical PR URLs across entries", () => {
    const url = "https://github.com/org/repo/pull/7";
    const entries = [
      makeEntry({ content: url }),
      makeEntry({ toolResult: url }),
      makeEntry({ content: `see ${url} for details` }),
    ];
    expect(extractPRs(entries)).toEqual([url]);
  });

  it("extracts multiple distinct PRs", () => {
    const entries = [
      makeEntry({ content: "https://github.com/org/repo/pull/1" }),
      makeEntry({ toolResult: "https://git.zoominfo.com/team/project/pull/200" }),
    ];
    const result = extractPRs(entries);
    expect(result).toHaveLength(2);
    expect(result).toContain("https://github.com/org/repo/pull/1");
    expect(result).toContain("https://git.zoominfo.com/team/project/pull/200");
  });

  it("returns empty array when no PRs found", () => {
    const entries = [
      makeEntry({ content: "just some discussion" }),
      makeEntry({ toolResult: "command output with no urls" }),
    ];
    expect(extractPRs(entries)).toEqual([]);
  });

  it("handles entries with no content or toolResult", () => {
    const entries = [makeEntry()];
    expect(extractPRs(entries)).toEqual([]);
  });
});

describe("parsePRUrl", () => {
  it("parses github.com PR URL", () => {
    const result = parsePRUrl("https://github.com/facebook/react/pull/456");
    expect(result).toEqual({
      number: "456",
      repo: "facebook/react",
      url: "https://github.com/facebook/react/pull/456",
    });
  });

  it("parses self-hosted PR URL", () => {
    const result = parsePRUrl(
      "https://git.zoominfo.com/DoubleO-ai/doubleo-server/pull/11636"
    );
    expect(result).toEqual({
      number: "11636",
      repo: "DoubleO-ai/doubleo-server",
      url: "https://git.zoominfo.com/DoubleO-ai/doubleo-server/pull/11636",
    });
  });
});
