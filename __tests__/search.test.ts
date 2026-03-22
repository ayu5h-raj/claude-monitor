import { describe, it, expect } from "vitest";
import { extractSnippet } from "../lib/search";

describe("extractSnippet", () => {
  it("returns snippet with mark tags around match", () => {
    const content = "This is a test string with some keywords in it.";
    const result = extractSnippet(content, ["test"]);
    expect(result).toContain("<mark>test</mark>");
  });

  it("returns context around the match", () => {
    const prefix = "a".repeat(100);
    const suffix = "b".repeat(100);
    const content = `${prefix} keyword ${suffix}`;
    const result = extractSnippet(content, ["keyword"], 80);
    expect(result).toContain("<mark>keyword</mark>");
    expect(result.startsWith("...")).toBe(true);
    expect(result.endsWith("...")).toBe(true);
    // Should be roughly 80 chars of context + markup
    const plainLength = result.replace(/<\/?mark>/g, "").replace(/\.\.\./g, "").length;
    expect(plainLength).toBeLessThanOrEqual(90);
  });

  it("handles match at start of content", () => {
    const content = "keyword followed by more text here and even more";
    const result = extractSnippet(content, ["keyword"], 40);
    expect(result).toContain("<mark>keyword</mark>");
    expect(result.startsWith("...")).toBe(false);
  });

  it("handles match at end of content", () => {
    const content = "some text here and keyword";
    const result = extractSnippet(content, ["keyword"], 40);
    expect(result).toContain("<mark>keyword</mark>");
    expect(result.endsWith("...")).toBe(false);
  });

  it("is case-insensitive", () => {
    const content = "The Quick Brown Fox";
    const result = extractSnippet(content, ["quick"]);
    expect(result).toContain("<mark>Quick</mark>");
  });

  it("highlights multiple terms", () => {
    const content = "Hello world, this is a test for search.";
    const result = extractSnippet(content, ["hello", "test"]);
    expect(result).toContain("<mark>Hello</mark>");
    expect(result).toContain("<mark>test</mark>");
  });

  it("returns empty string for no match", () => {
    const content = "nothing matches here";
    const result = extractSnippet(content, ["xyz"]);
    expect(result).toBe("");
  });

  it("HTML-escapes content to prevent XSS", () => {
    const content = 'User said <script>alert("xss")</script> in session';
    const result = extractSnippet(content, ["user"]);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
    expect(result).toContain("<mark>User</mark>");
  });

  it("handles special regex chars in query terms", () => {
    const content = "The value is $100.00 which is the price.";
    const result = extractSnippet(content, ["$100.00"]);
    expect(result).toContain("<mark>$100.00</mark>");
  });

  it("handles empty query terms", () => {
    const content = "some text";
    const result = extractSnippet(content, []);
    expect(result).toBe("");
  });
});
