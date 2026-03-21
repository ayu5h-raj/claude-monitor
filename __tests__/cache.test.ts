import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TTLCache } from "@/lib/cache";

describe("TTLCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for missing keys", () => {
    const cache = new TTLCache<string>(30000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves values", () => {
    const cache = new TTLCache<string>(30000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("expires entries after TTL", () => {
    const cache = new TTLCache<string>(30000);
    cache.set("key", "value");
    vi.advanceTimersByTime(31000);
    expect(cache.get("key")).toBeUndefined();
  });

  it("returns value before TTL expires", () => {
    const cache = new TTLCache<string>(30000);
    cache.set("key", "value");
    vi.advanceTimersByTime(29000);
    expect(cache.get("key")).toBe("value");
  });

  it("invalidates specific keys", () => {
    const cache = new TTLCache<string>(30000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.invalidate("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
  });

  it("clears all entries", () => {
    const cache = new TTLCache<string>(30000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  it("getOrSet computes and caches value", async () => {
    const cache = new TTLCache<string>(30000);
    const compute = vi.fn().mockResolvedValue("computed");
    const result = await cache.getOrSet("key", compute);
    expect(result).toBe("computed");
    expect(compute).toHaveBeenCalledOnce();

    const result2 = await cache.getOrSet("key", compute);
    expect(result2).toBe("computed");
    expect(compute).toHaveBeenCalledOnce(); // not called again
  });
});
