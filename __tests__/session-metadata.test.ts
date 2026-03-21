import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  getAllSessionMetadata,
  getSessionMetadata,
  getAllTags,
  setBookmark,
  addTag,
  removeTag,
  setTags,
  setNotes,
  _resetCacheForTests,
} from "@/lib/session-metadata";

const TEST_DIR = path.join(os.tmpdir(), "claude-monitor-test-" + Date.now());
const TEST_FILE = path.join(TEST_DIR, "session-metadata.json");

describe("session-metadata", () => {
  beforeEach(async () => {
    process.env.CLAUDE_MONITOR_DIR = TEST_DIR;
    _resetCacheForTests();
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    delete process.env.CLAUDE_MONITOR_DIR;
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("getAllSessionMetadata", () => {
    it("returns empty object when file does not exist", async () => {
      const result = await getAllSessionMetadata();
      expect(result).toEqual({});
    });

    it("returns parsed metadata when file exists", async () => {
      await fs.writeFile(
        TEST_FILE,
        JSON.stringify({
          sessions: {
            "s1": { bookmarked: true, tags: ["fix"], updatedAt: "2026-01-01T00:00:00Z" },
          },
        })
      );
      const result = await getAllSessionMetadata();
      expect(result["s1"]).toBeDefined();
      expect(result["s1"].bookmarked).toBe(true);
      expect(result["s1"].tags).toEqual(["fix"]);
    });
  });

  describe("getSessionMetadata", () => {
    it("returns null for unknown session", async () => {
      const result = await getSessionMetadata("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("setBookmark", () => {
    it("creates file and sets bookmark", async () => {
      await setBookmark("s1", true);
      const data = JSON.parse(await fs.readFile(TEST_FILE, "utf-8"));
      expect(data.sessions.s1.bookmarked).toBe(true);
    });

    it("unsets bookmark", async () => {
      await setBookmark("s1", true);
      await setBookmark("s1", false);
      _resetCacheForTests();
      const result = await getSessionMetadata("s1");
      expect(result?.bookmarked).toBe(false);
    });
  });

  describe("addTag / removeTag", () => {
    it("adds a tag", async () => {
      await addTag("s1", "deploy-fix");
      _resetCacheForTests();
      const meta = await getSessionMetadata("s1");
      expect(meta?.tags).toEqual(["deploy-fix"]);
    });

    it("does not duplicate tags", async () => {
      await addTag("s1", "fix");
      await addTag("s1", "fix");
      _resetCacheForTests();
      const meta = await getSessionMetadata("s1");
      expect(meta?.tags).toEqual(["fix"]);
    });

    it("removes a tag", async () => {
      await addTag("s1", "a");
      await addTag("s1", "b");
      await removeTag("s1", "a");
      _resetCacheForTests();
      const meta = await getSessionMetadata("s1");
      expect(meta?.tags).toEqual(["b"]);
    });

    it("rejects invalid tag format", async () => {
      await expect(addTag("s1", "Has Spaces")).rejects.toThrow();
      await expect(addTag("s1", "UPPERCASE")).rejects.toThrow();
      await expect(addTag("s1", "a".repeat(31))).rejects.toThrow();
    });

    it("rejects more than 10 tags", async () => {
      for (let i = 0; i < 10; i++) {
        await addTag("s1", `tag-${i}`);
      }
      await expect(addTag("s1", "tag-overflow")).rejects.toThrow();
    });
  });

  describe("setTags", () => {
    it("replaces all tags at once", async () => {
      await addTag("s1", "old-tag");
      await setTags("s1", ["new-a", "new-b"]);
      _resetCacheForTests();
      const meta = await getSessionMetadata("s1");
      expect(meta?.tags).toEqual(["new-a", "new-b"]);
    });

    it("validates all tags", async () => {
      await expect(setTags("s1", ["valid", "INVALID"])).rejects.toThrow();
    });
  });

  describe("setNotes", () => {
    it("sets notes on a session", async () => {
      await setNotes("s1", "This was a good session");
      _resetCacheForTests();
      const meta = await getSessionMetadata("s1");
      expect(meta?.notes).toBe("This was a good session");
    });
  });

  describe("getAllTags", () => {
    it("returns deduplicated sorted tags", async () => {
      await addTag("s1", "beta");
      await addTag("s1", "alpha");
      await addTag("s2", "beta");
      await addTag("s2", "gamma");
      _resetCacheForTests();
      const tags = await getAllTags();
      expect(tags).toEqual(["alpha", "beta", "gamma"]);
    });
  });
});
