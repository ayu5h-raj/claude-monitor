import { describe, it, expect } from "vitest";
import { getNewLines } from "../lib/sse-helpers";

describe("getNewLines", () => {
  it("returns empty array when no new lines", () => {
    const content = '{"type":"user"}\n{"type":"assistant"}\n';
    const result = getNewLines(content, 2);
    expect(result).toEqual([]);
  });

  it("returns new lines beyond baseline", () => {
    const content = '{"type":"user"}\n{"type":"assistant"}\n{"type":"user","new":true}\n';
    const result = getNewLines(content, 2);
    expect(result).toEqual(['{"type":"user","new":true}']);
  });

  it("returns empty array for empty content", () => {
    const result = getNewLines("", 0);
    expect(result).toEqual([]);
  });

  it("returns all lines when baseline is 0", () => {
    const content = '{"line":1}\n{"line":2}\n';
    const result = getNewLines(content, 0);
    expect(result).toEqual(['{"line":1}', '{"line":2}']);
  });

  it("handles baseline larger than content", () => {
    const content = '{"line":1}\n';
    const result = getNewLines(content, 5);
    expect(result).toEqual([]);
  });

  it("ignores empty lines", () => {
    const content = '{"line":1}\n\n\n{"line":2}\n\n';
    const result = getNewLines(content, 1);
    expect(result).toEqual(['{"line":2}']);
  });
});
