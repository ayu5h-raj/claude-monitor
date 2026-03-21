import { describe, it, expect } from "vitest";
import { extractRepoName, formatRelativeTime, formatTokenCount } from "@/lib/path-utils";

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
