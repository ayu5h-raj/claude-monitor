# Session Productivity Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add session bookmarks/tags, notes, and quick actions to transform claude-monitor from a read-only viewer into an actionable dashboard.

**Architecture:** User-generated metadata stored in `~/.claude-monitor/session-metadata.json` (separate from read-only `~/.claude/`). All mutations via Next.js server actions with `<form>` submissions. No client components — uses existing inline `<script>` + toast patterns for clipboard actions.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript, vitest

**Spec:** `docs/superpowers/specs/2026-03-22-session-productivity-features-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `lib/session-metadata.ts` | Read/write `~/.claude-monitor/session-metadata.json` with atomic writes and TTL cache |
| `src/app/actions/metadata.ts` | Server actions for bookmark, tag, and notes mutations |
| `src/app/api/export/[id]/route.ts` | Markdown export endpoint returning downloadable `.md` file |
| `src/components/quick-actions.tsx` | Action bar for session detail page (server component) |
| `src/components/tag-pills.tsx` | Tag pill display with consistent hash-based colors (server component) |
| `src/components/bookmark-button.tsx` | Bookmark star toggle as `<form>` (server component) |
| `src/components/session-notes.tsx` | Notes section with `<details>/<summary>` and `<form>` (server component) |
| `__tests__/session-metadata.test.ts` | Unit tests for metadata store |

### Modified Files
| File | Changes |
|------|---------|
| `lib/types.ts` | Add `SessionMetadata` interface |
| `src/app/layout.tsx` | Add shared toast/clipboard inline script |
| `src/app/sessions/[id]/page.tsx` | Fix date handling, add bookmark/tags/notes/quick-actions |
| `src/components/session-list.tsx` | Remove duplicated toast script (moved to layout), pass metadata to rows |
| `src/components/session-row.tsx` | Add bookmark star, tag pills, notes icon, more-actions menu |
| `src/components/sidebar.tsx` | Add bookmarks/tags filter sections |
| `src/app/page.tsx` | Read metadata, support `?bookmarked=true` and `?tag=X` params |

---

## Task 0: Validate Server Actions

**Files:**
- Create: `src/app/actions/test-action.ts` (temporary, deleted after validation)
- Modify: `src/app/sessions/[id]/page.tsx` (temporary test form, reverted after)

- [ ] **Step 1: Create a minimal server action**

```typescript
// src/app/actions/test-action.ts
"use server";

import { redirect } from "next/navigation";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function testAction(formData: FormData) {
  const value = formData.get("test") as string;
  const dir = path.join(os.homedir(), ".claude-monitor");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "test.txt"), value || "it works");
  redirect("/sessions/" + formData.get("sessionId"));
}
```

- [ ] **Step 2: Add a test form to the session detail page**

Add temporarily at the top of the session detail page JSX (after the header):

```tsx
import { testAction } from "@/app/actions/test-action";

// Inside the component JSX, add:
<form action={testAction}>
  <input type="hidden" name="sessionId" value={session.id} />
  <input type="hidden" name="test" value="server-actions-work" />
  <button type="submit" style={{ color: "#00ff41", border: "1px solid #333", padding: "4px 8px", background: "#111", cursor: "pointer", fontFamily: "inherit" }}>
    Test Server Action
  </button>
</form>
```

- [ ] **Step 3: Run dev server and test**

Run: `npm run dev`
Navigate to any session detail page, click "Test Server Action".
Expected: Page redirects back. File `~/.claude-monitor/test.txt` exists with content "server-actions-work".

```bash
cat ~/.claude-monitor/test.txt
# Expected output: server-actions-work
```

- [ ] **Step 4: Clean up**

Remove the test form from the session detail page. Delete `src/app/actions/test-action.ts`. Delete `~/.claude-monitor/test.txt`.

**If server actions DON'T work:** Pivot to API routes with `<form action="/api/..." method="POST">`. Update all subsequent tasks to use API routes instead. See the spec's fallback note.

- [ ] **Step 5: Commit**

```bash
# Only commit if you made a pivot to API routes. Otherwise, nothing to commit — this was a validation step.
```

---

## Task 1: Add `SessionMetadata` Type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the SessionMetadata interface**

Add at the end of `lib/types.ts` (after line 141):

```typescript
export interface SessionMetadata {
  bookmarked?: boolean;
  tags?: string[];
  notes?: string;
  updatedAt: string; // ISO timestamp
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors related to SessionMetadata.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add SessionMetadata type"
```

---

## Task 2: Implement Session Metadata Store (TDD)

**Files:**
- Create: `lib/session-metadata.ts`
- Create: `__tests__/session-metadata.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/session-metadata.test.ts
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

// Use a temp directory for tests
const TEST_DIR = path.join(os.tmpdir(), "claude-monitor-test-" + Date.now());
const TEST_FILE = path.join(TEST_DIR, "session-metadata.json");

describe("session-metadata", () => {
  beforeEach(async () => {
    // Override the paths for testing
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/session-metadata.test.ts`
Expected: FAIL — module `../lib/session-metadata` not found.

- [ ] **Step 3: Implement the metadata store**

```typescript
// lib/session-metadata.ts
import fs from "fs/promises";
import path from "path";
import os from "os";
import { TTLCache } from "./cache";
import type { SessionMetadata } from "./types";

function getDir(): string {
  return process.env.CLAUDE_MONITOR_DIR || path.join(os.homedir(), ".claude-monitor");
}

function getFile(): string {
  return path.join(getDir(), "session-metadata.json");
}

interface MetadataStore {
  sessions: Record<string, SessionMetadata>;
}

const cache = new TTLCache<Record<string, SessionMetadata>>(30_000);

export function _resetCacheForTests(): void {
  cache.clear();
}

async function readStore(): Promise<MetadataStore> {
  try {
    const content = await fs.readFile(getFile(), "utf-8");
    return JSON.parse(content) as MetadataStore;
  } catch {
    return { sessions: {} };
  }
}

async function writeStore(store: MetadataStore): Promise<void> {
  const dir = getDir();
  await fs.mkdir(dir, { recursive: true });
  const tmpFile = path.join(dir, `.session-metadata-${Date.now()}.tmp`);
  await fs.writeFile(tmpFile, JSON.stringify(store, null, 2));
  await fs.rename(tmpFile, getFile());
  cache.invalidate("all");
}

function validateTag(tag: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
    throw new Error(`Invalid tag "${tag}": must be lowercase alphanumeric + hyphens`);
  }
  if (tag.length > 30) {
    throw new Error(`Tag "${tag}" exceeds 30 character limit`);
  }
}

// --- Read functions ---

export async function getAllSessionMetadata(): Promise<Record<string, SessionMetadata>> {
  const cached = cache.get("all");
  if (cached) return cached;
  const store = await readStore();
  cache.set("all", store.sessions);
  return store.sessions;
}

export async function getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
  const all = await getAllSessionMetadata();
  return all[sessionId] || null;
}

export async function getAllTags(): Promise<string[]> {
  const all = await getAllSessionMetadata();
  const tagSet = new Set<string>();
  for (const meta of Object.values(all)) {
    if (meta.tags) {
      for (const tag of meta.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

// --- Write functions ---

export async function setBookmark(sessionId: string, bookmarked: boolean): Promise<void> {
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  store.sessions[sessionId].bookmarked = bookmarked;
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function addTag(sessionId: string, tag: string): Promise<void> {
  validateTag(tag);
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  const existing = store.sessions[sessionId].tags || [];
  if (existing.length >= 10) {
    throw new Error("Maximum 10 tags per session");
  }
  if (!existing.includes(tag)) {
    store.sessions[sessionId].tags = [...existing, tag];
    store.sessions[sessionId].updatedAt = new Date().toISOString();
    await writeStore(store);
  }
}

export async function removeTag(sessionId: string, tag: string): Promise<void> {
  const store = await readStore();
  if (!store.sessions[sessionId]?.tags) return;
  store.sessions[sessionId].tags = store.sessions[sessionId].tags!.filter((t) => t !== tag);
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function setTags(sessionId: string, tags: string[]): Promise<void> {
  for (const tag of tags) {
    validateTag(tag);
  }
  if (tags.length > 10) {
    throw new Error("Maximum 10 tags per session");
  }
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  store.sessions[sessionId].tags = [...new Set(tags)];
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function setNotes(sessionId: string, notes: string): Promise<void> {
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  store.sessions[sessionId].notes = notes;
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/session-metadata.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/session-metadata.ts __tests__/session-metadata.test.ts
git commit -m "feat: add session metadata store with tests"
```

---

## Task 3: Create Server Actions

**Files:**
- Create: `src/app/actions/metadata.ts`

- [ ] **Step 1: Implement all server actions**

```typescript
// src/app/actions/metadata.ts
"use server";

import { redirect } from "next/navigation";
import {
  setBookmark,
  addTag,
  removeTag,
  setNotes,
} from "@/lib/session-metadata";

export async function toggleBookmarkAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const current = formData.get("bookmarked") === "true";
  await setBookmark(sessionId, !current);
  redirect(returnUrl);
}

export async function addTagAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const tag = (formData.get("tag") as string || "").toLowerCase().trim();

  try {
    await addTag(sessionId, tag);
  } catch {
    const url = new URL(returnUrl, "http://localhost");
    url.searchParams.set("error", "invalid-tag");
    redirect(url.pathname + url.search);
    return;
  }
  redirect(returnUrl);
}

export async function removeTagAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const tag = formData.get("tag") as string;
  if (!tag) return redirect(returnUrl);
  await removeTag(sessionId, tag);
  redirect(returnUrl);
}

export async function saveNotesAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const notes = (formData.get("notes") as string || "").trim();
  await setNotes(sessionId, notes);
  redirect(returnUrl);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/metadata.ts
git commit -m "feat: add server actions for metadata mutations"
```

---

## Task 4: Consolidate Toast/Clipboard Script into Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/session-list.tsx`
- Modify: `src/app/sessions/[id]/page.tsx`

The toast/clipboard code is currently duplicated between `session-list.tsx` (lines ~100-154) and `sessions/[id]/page.tsx` (lines ~120-168). Consolidate into `layout.tsx` so it's globally available.

- [ ] **Step 1: Read the current toast scripts in both files**

Read `src/components/session-list.tsx` and `src/app/sessions/[id]/page.tsx` to identify the exact toast/clipboard code blocks. Look for `window.__copyCmd`, `window.__showCopyToast`, and the toast element creation code.

- [ ] **Step 2: Add the consolidated script to layout.tsx**

In `src/app/layout.tsx`, add a `<script dangerouslySetInnerHTML>` inside `<body>` (before `<Nav />`). The script should expose two global functions:
- `window.__showCopyToast(msg)` — creates and shows a toast notification
- `window.__copyToClipboard(text, label)` — copies text to clipboard and shows toast

Combine the best parts of both existing scripts into one. Keep the fallback textarea approach for clipboard. Keep the fade-in/out animation.

- [ ] **Step 3: Remove the duplicated toast scripts from session-list.tsx and sessions/[id]/page.tsx**

In `session-list.tsx`: remove the inline `<script>` block that defines `window.__copyCmd` and the toast logic.
In `sessions/[id]/page.tsx`: remove the inline `<script>` block that defines `window.__showCopyToast` and clipboard logic.

Update any references in these files to use the new global functions (`window.__copyToClipboard`).

- [ ] **Step 4: Verify dev server works**

Run: `npm run dev`
Navigate to the home page and session detail page. Click copy buttons — toast should still appear with the copied command.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/session-list.tsx src/app/sessions/[id]/page.tsx
git commit -m "refactor: consolidate toast/clipboard script into layout"
```

---

## Task 5: Fix Session Detail Date Handling

**Files:**
- Modify: `src/app/sessions/[id]/page.tsx`

The session detail page uses `toLocaleTimeString()` and `toLocaleDateString()` which causes hydration mismatch. Fix before adding new features.

- [ ] **Step 1: Read the current session detail page**

Read `src/app/sessions/[id]/page.tsx`. Identify all uses of:
- `toLocaleTimeString()`
- `toLocaleDateString()`
- `session.startedAt.getTime()` (Date object method)

- [ ] **Step 2: Replace with ISO string slicing**

Replace all date formatting with the ISO string slicing pattern used by `conversation-entry.tsx`:
- Date display: `isoStr.slice(0, 10)` → "2026-03-22"
- Time display: `isoStr.slice(11, 19)` → "14:30:00"
- Duration calculation: use the already-serialized ISO strings. Parse to timestamps only for arithmetic: `new Date(isoStr).getTime()`.

- [ ] **Step 3: Verify dev server shows correct dates**

Run: `npm run dev`
Navigate to any session detail page. Dates and times should display correctly without hydration warnings in the console.

- [ ] **Step 4: Commit**

```bash
git add src/app/sessions/[id]/page.tsx
git commit -m "fix: replace toLocaleTimeString with ISO string slicing in session detail"
```

---

## Task 6: Bookmark Button Component

**Files:**
- Create: `src/components/bookmark-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/bookmark-button.tsx
import { toggleBookmarkAction } from "@/app/actions/metadata";

interface BookmarkButtonProps {
  sessionId: string;
  bookmarked: boolean;
  returnUrl: string;
  size?: "sm" | "md";
}

export function BookmarkButton({ sessionId, bookmarked, returnUrl, size = "md" }: BookmarkButtonProps) {
  const fontSize = size === "sm" ? "12px" : "16px";

  return (
    <form action={toggleBookmarkAction} style={{ display: "inline" }}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="bookmarked" value={String(bookmarked)} />
      <input type="hidden" name="returnUrl" value={returnUrl} />
      <button
        type="submit"
        title={bookmarked ? "Remove bookmark" : "Add bookmark"}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize,
          padding: "0 2px",
          color: bookmarked ? "#ffaa00" : "#555555",
          fontFamily: "inherit",
        }}
      >
        {bookmarked ? "★" : "☆"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/bookmark-button.tsx
git commit -m "feat: add BookmarkButton server component"
```

---

## Task 7: Tag Pills Component

**Files:**
- Create: `src/components/tag-pills.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/tag-pills.tsx
import { removeTagAction } from "@/app/actions/metadata";

const TAG_COLORS = ["#00ff41", "#ffaa00", "#00aaff", "#aa88ff", "#ff4444"];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash += tag.charCodeAt(i);
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

interface TagPillsProps {
  tags: string[];
  sessionId?: string;    // If provided, show remove buttons
  returnUrl?: string;    // Required if sessionId is provided
}

export function TagPills({ tags, sessionId, returnUrl }: TagPillsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <span style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
      {tags.map((tag) => {
        const color = getTagColor(tag);
        return (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "3px",
              border: `1px solid ${color}44`,
              color,
              background: `${color}11`,
            }}
          >
            {tag}
            {sessionId && returnUrl && (
              <form action={removeTagAction} style={{ display: "inline", margin: 0 }}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="tag" value={tag} />
                <input type="hidden" name="returnUrl" value={returnUrl} />
                <button
                  type="submit"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    fontSize: "10px",
                    padding: "0 0 0 2px",
                    fontFamily: "inherit",
                  }}
                >
                  ×
                </button>
              </form>
            )}
          </span>
        );
      })}
    </span>
  );
}

// Export for use in other components
export { getTagColor };
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tag-pills.tsx
git commit -m "feat: add TagPills server component with hash-based colors"
```

---

## Task 8: Session Notes Component

**Files:**
- Create: `src/components/session-notes.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/session-notes.tsx
import { saveNotesAction } from "@/app/actions/metadata";

interface SessionNotesProps {
  sessionId: string;
  notes: string;
  returnUrl: string;
}

export function SessionNotes({ sessionId, notes, returnUrl }: SessionNotesProps) {
  const preview = notes ? notes.split("\n")[0].slice(0, 60) : "No notes";

  return (
    <details style={{ marginBottom: "16px" }}>
      <summary
        style={{
          cursor: "pointer",
          color: "#888",
          fontSize: "12px",
          padding: "8px 12px",
          background: "#0d0d0d",
          border: "1px solid #222",
          borderRadius: "3px",
        }}
      >
        <span style={{ color: "#ffaa00" }}>Notes</span>
        <span style={{ color: "#555", marginLeft: "8px" }}>{preview}</span>
      </summary>
      <div
        style={{
          padding: "12px",
          background: "#0d0d0d",
          border: "1px solid #222",
          borderTop: "none",
          borderRadius: "0 0 3px 3px",
        }}
      >
        <form action={saveNotesAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="returnUrl" value={returnUrl} />
          <textarea
            name="notes"
            defaultValue={notes}
            rows={4}
            placeholder="Add notes about this session..."
            style={{
              width: "100%",
              background: "#111",
              color: "#ccc",
              border: "1px solid #333",
              borderRadius: "3px",
              padding: "8px",
              fontFamily: "inherit",
              fontSize: "12px",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: "8px", textAlign: "right" }}>
            <button
              type="submit"
              style={{
                background: "#111",
                color: "#00ff41",
                border: "1px solid #333",
                padding: "4px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "12px",
                borderRadius: "3px",
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/session-notes.tsx
git commit -m "feat: add SessionNotes component with details/summary pattern"
```

---

## Task 9: Quick Actions Component

**Files:**
- Create: `src/components/quick-actions.tsx`

- [ ] **Step 1: Create the component**

The component renders an action bar with clipboard buttons. Each button uses `onclick` inline handler that calls the global `window.__copyToClipboard(text, label)` function (consolidated in Task 4).

```tsx
// src/components/quick-actions.tsx

interface QuickActionsProps {
  sessionId: string;
  projectPath: string;
  project: string;
  branch: string;
  duration: string;
  filesChanged: number;
  tokenCount: string;
  firstMessage?: string;
}

export function QuickActions({
  sessionId,
  projectPath,
  project,
  branch,
  duration,
  filesChanged,
  tokenCount,
  firstMessage,
}: QuickActionsProps) {
  const shortId = sessionId.slice(0, 8);
  const resumeCmd = `claude --resume ${sessionId}`;
  const cdCmd = `cd "${projectPath}"`;
  const codeCmd = `code "${projectPath}"`;
  const summary = [
    `Session: ${shortId}`,
    `Project: ${project}`,
    `Branch: ${branch}`,
    `Duration: ${duration}`,
    `Files changed: ${filesChanged}`,
    `Tokens: ${tokenCount}`,
    firstMessage ? `---\n${firstMessage.slice(0, 200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const buttonStyle = {
    background: "#111",
    color: "#888",
    border: "1px solid #333",
    padding: "4px 10px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "11px",
    borderRadius: "3px",
  };

  return (
    <div id="quick-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
      <button
        type="button"
        style={buttonStyle}
        data-copy-action={resumeCmd}
        data-copy-label="resume command"
      >
        [Resume]
      </button>
      <button
        type="button"
        style={buttonStyle}
        data-copy-action={cdCmd}
        data-copy-label="cd command"
      >
        [Terminal]
      </button>
      <button
        type="button"
        style={buttonStyle}
        data-copy-action={codeCmd}
        data-copy-label="code command"
      >
        [VS Code]
      </button>
      <button
        type="button"
        style={buttonStyle}
        data-copy-action={summary}
        data-copy-label="session summary"
      >
        [Summary]
      </button>
      <a
        href={`/api/export/${sessionId}`}
        style={{
          ...buttonStyle,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        [Export]
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  document.querySelectorAll('#quick-actions [data-copy-action]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var text = e.currentTarget.getAttribute('data-copy-action');
      var label = e.currentTarget.getAttribute('data-copy-label');
      if (window.__copyToClipboard) {
        window.__copyToClipboard(text, label);
      }
    });
    btn.addEventListener('mouseenter', function(e) {
      e.currentTarget.style.color = '#00ff41';
      e.currentTarget.style.borderColor = '#00ff41';
    });
    btn.addEventListener('mouseleave', function(e) {
      e.currentTarget.style.color = '#888';
      e.currentTarget.style.borderColor = '#333';
    });
  });
})();
`,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/quick-actions.tsx
git commit -m "feat: add QuickActions component for session detail page"
```

---

## Task 10: Export API Route

**Files:**
- Create: `src/app/api/export/[id]/route.ts`

- [ ] **Step 1: Create the export route**

```typescript
// src/app/api/export/[id]/route.ts
import { getSessionDetail } from "@/lib/claude-data";
import { getSessionMetadata } from "@/lib/session-metadata";
import { formatDuration, formatTokenCount } from "@/lib/path-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getSessionDetail(id);

  if (!detail) {
    return new Response("Session not found", { status: 404 });
  }

  const { session, entries } = detail;
  const metadata = await getSessionMetadata(id);
  const shortId = id.slice(0, 8);
  const totalTokens = session.tokenUsage.input + session.tokenUsage.output;
  const duration =
    session.startedAt && session.lastActiveAt
      ? formatDuration(
          new Date(session.lastActiveAt).getTime() - new Date(session.startedAt).getTime()
        )
      : "unknown";

  let md = `# Session ${shortId}\n\n`;
  md += `**Project:** ${session.project}\n`;
  md += `**Branch:** ${session.branch}\n`;
  md += `**Started:** ${session.startedAt instanceof Date ? session.startedAt.toISOString() : session.startedAt}\n`;
  md += `**Duration:** ${duration}\n`;
  md += `**Model:** ${session.model}\n`;
  md += `**Tokens:** ${formatTokenCount(totalTokens)} (input: ${formatTokenCount(session.tokenUsage.input)}, output: ${formatTokenCount(session.tokenUsage.output)})\n`;

  if (session.filesChanged.length > 0) {
    md += `**Files changed:** ${session.filesChanged.join(", ")}\n`;
  }

  if (metadata?.tags?.length) {
    md += `**Tags:** ${metadata.tags.join(", ")}\n`;
  }

  if (metadata?.notes) {
    md += `\n> ${metadata.notes.replace(/\n/g, "\n> ")}\n`;
  }

  md += `\n---\n\n## Conversation\n\n`;

  for (const entry of entries) {
    const time = typeof entry.timestamp === "string"
      ? entry.timestamp.slice(11, 19)
      : entry.timestamp.toISOString().slice(11, 19);

    if (entry.type === "user") {
      md += `### User — ${time}\n\n${entry.content}\n\n`;
    } else if (entry.type === "assistant") {
      md += `### Assistant — ${time}\n\n${entry.content}\n\n`;
    } else if (entry.type === "tool_use") {
      md += `#### Tool: ${entry.toolName}\n\n`;
      if (entry.toolInput) {
        const inputStr = typeof entry.toolInput === "string"
          ? entry.toolInput
          : JSON.stringify(entry.toolInput, null, 2);
        const truncated = inputStr.length > 500 ? inputStr.slice(0, 500) + "\n...(truncated)" : inputStr;
        md += `**Input:**\n\`\`\`json\n${truncated}\n\`\`\`\n\n`;
      }
    } else if (entry.type === "tool_result") {
      const status = entry.isError ? "ERROR" : "OK";
      md += `**Result (${status}):**\n`;
      if (entry.content) {
        const truncated =
          entry.content.length > 500
            ? entry.content.slice(0, 500) + "\n...(truncated)"
            : entry.content;
        md += `\`\`\`\n${truncated}\n\`\`\`\n\n`;
      }
    }
  }

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-${shortId}.md"`,
    },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Test manually**

Run: `npm run dev`
Navigate to `/api/export/<any-session-id>` in the browser.
Expected: Browser downloads a `.md` file with the conversation formatted as markdown.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/export/[id]/route.ts
git commit -m "feat: add markdown export API route"
```

---

## Task 11: Integrate Bookmarks, Tags, Notes into Session Detail Page

**Files:**
- Modify: `src/app/sessions/[id]/page.tsx`

- [ ] **Step 1: Read the current session detail page**

Read `src/app/sessions/[id]/page.tsx` to understand the current layout.

- [ ] **Step 2: Add imports and data fetching**

Add imports at the top:
```typescript
import { getSessionMetadata } from "@/lib/session-metadata";
import { BookmarkButton } from "@/components/bookmark-button";
import { TagPills } from "@/components/tag-pills";
import { SessionNotes } from "@/components/session-notes";
import { QuickActions } from "@/components/quick-actions";
import { addTagAction } from "@/app/actions/metadata";
import { formatDuration, formatTokenCount } from "@/lib/path-utils";
```

In the component body, after fetching session detail:
```typescript
const metadata = await getSessionMetadata(session.id);
const returnUrl = `/sessions/${session.id}`;
```

- [ ] **Step 3: Add bookmark button to the header**

In the header section (near the session title), add:
```tsx
<BookmarkButton
  sessionId={session.id}
  bookmarked={metadata?.bookmarked || false}
  returnUrl={returnUrl}
/>
```

- [ ] **Step 4: Add tag management section below the header**

After the header and before the metadata box:
```tsx
<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
  <TagPills tags={metadata?.tags || []} sessionId={session.id} returnUrl={returnUrl} />
  <form action={addTagAction} style={{ display: "inline-flex", gap: "4px" }}>
    <input type="hidden" name="sessionId" value={session.id} />
    <input type="hidden" name="returnUrl" value={returnUrl} />
    <input
      type="text"
      name="tag"
      placeholder="Add tag..."
      style={{
        background: "#111",
        color: "#ccc",
        border: "1px solid #333",
        borderRadius: "3px",
        padding: "2px 8px",
        fontSize: "11px",
        fontFamily: "inherit",
        width: "120px",
      }}
    />
    <button
      type="submit"
      style={{
        background: "#111",
        color: "#555",
        border: "1px solid #333",
        borderRadius: "3px",
        padding: "2px 8px",
        fontSize: "11px",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      +
    </button>
  </form>
</div>
```

If `searchParams` contains `error=invalid-tag`, show an error message:
```tsx
{error === "invalid-tag" && (
  <div style={{ color: "#ff4444", fontSize: "11px", marginBottom: "8px" }}>
    Invalid tag. Use lowercase letters, numbers, and hyphens (max 30 chars, max 10 tags).
  </div>
)}
```

- [ ] **Step 5: Add Quick Actions bar**

After the tag section, before the metadata box:
```tsx
<QuickActions
  sessionId={session.id}
  projectPath={session.projectPath}
  project={session.project}
  branch={session.branch}
  duration={duration}
  filesChanged={session.filesChanged.length}
  tokenCount={formatTokenCount(totalTokens)}
  firstMessage={session.firstMessage}
/>
```

- [ ] **Step 6: Add Session Notes**

After the metadata box, before the conversation entries:
```tsx
<SessionNotes
  sessionId={session.id}
  notes={metadata?.notes || ""}
  returnUrl={returnUrl}
/>
```

- [ ] **Step 7: Verify dev server renders correctly**

Run: `npm run dev`
Navigate to a session detail page. Verify:
- Bookmark star appears in header
- Tag input shows below header
- Quick actions bar renders with all buttons
- Notes section appears as collapsible
- All forms submit correctly

- [ ] **Step 8: Commit**

```bash
git add src/app/sessions/[id]/page.tsx
git commit -m "feat: add bookmarks, tags, notes, and quick actions to session detail"
```

---

## Task 12: Integrate Bookmarks and Tags into Session Row

**Files:**
- Modify: `src/components/session-row.tsx`

- [ ] **Step 1: Read the current session row component**

Read `src/components/session-row.tsx` for exact layout and grid structure.

- [ ] **Step 2: Add bookmark and tag props**

Add props to the component interface:
```typescript
bookmarked?: boolean;
tags?: string[];
hasNotes?: boolean;
returnUrl: string;
```

- [ ] **Step 3: Add bookmark star before the project name**

In the grid row, add a `BookmarkButton` (size="sm") in the indicator column or as a new small column. Since the grid columns are fixed, put the star inline with the project name:
```tsx
<span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
  <BookmarkButton sessionId={id} bookmarked={bookmarked || false} returnUrl={returnUrl} size="sm" />
  <span>{displayName}</span>
</span>
```

**Important:** The session row is wrapped in a `<Link>`. A `<form>` inside an `<a>` can cause navigation conflicts. To prevent this, the `BookmarkButton`'s `<form>` needs an inline script that calls `e.stopPropagation()` on form submit clicks, preventing the parent `<Link>` from navigating. Alternatively, restructure the row so the `<Link>` wraps only the clickable text area, not the action buttons. Use the same pattern as the existing copy-resume button.

- [ ] **Step 4: Add tag pills after the branch name**

In the branch column, append the tag pills:
```tsx
<span>
  {branch}
  {tags && tags.length > 0 && (
    <span style={{ marginLeft: "6px" }}>
      <TagPills tags={tags} />
    </span>
  )}
</span>
```

- [ ] **Step 5: Add notes icon**

If `hasNotes` is true, add a small icon near the copy button area:
```tsx
{hasNotes && (
  <span
    style={{ color: "#ffaa00", fontSize: "11px", position: "relative" }}
    data-tooltip={notesPreview}
    className="notes-tooltip"
  >
    ✎
  </span>
)}
```

Where `notesPreview` is a new prop containing the first 100 characters of the notes. The tooltip uses the CSS `::after` pseudo-element pattern from `contribution-heatmap.tsx` (defined in `globals.css`). Add a `.notes-tooltip` CSS rule in `globals.css`:

```css
.notes-tooltip:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  right: 0;
  background: #222;
  color: #ccc;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 10px;
  white-space: pre-wrap;
  max-width: 200px;
  z-index: 10;
  pointer-events: none;
}
```

- [ ] **Step 6: Verify the row renders correctly**

Run: `npm run dev`
Check that session rows show bookmark stars, tag pills, and notes icons.

- [ ] **Step 7: Commit**

```bash
git add src/components/session-row.tsx
git commit -m "feat: add bookmark, tags, and notes indicators to session rows"
```

---

## Task 13: Add Sidebar Bookmark and Tag Filters

**Files:**
- Modify: `src/components/sidebar.tsx`

- [ ] **Step 1: Read the current sidebar component**

Read `src/components/sidebar.tsx` to understand the layout and props.

- [ ] **Step 2: Add new props for metadata**

Add to the sidebar props:
```typescript
bookmarkCount: number;
tagCounts: { tag: string; count: number }[];
selectedTag?: string;
showBookmarked?: boolean;
```

- [ ] **Step 3: Add Bookmarked section**

After the repository list, before the "Today" stats, add:
```tsx
<div style={{ borderTop: "1px solid #222", padding: "12px 16px" }}>
  <a
    href="/?bookmarked=true"
    style={{
      color: showBookmarked ? "#00ff41" : "#888",
      textDecoration: "none",
      fontSize: "12px",
      display: "block",
      padding: "4px 0",
      borderLeft: showBookmarked ? "2px solid #00ff41" : "2px solid transparent",
      paddingLeft: "8px",
    }}
  >
    ★ Bookmarked ({bookmarkCount})
  </a>
</div>
```

- [ ] **Step 4: Add Tags section**

Below the Bookmarked section:
```tsx
{tagCounts.length > 0 && (
  <div style={{ padding: "0 16px 12px" }}>
    <div style={{ color: "#555", fontSize: "10px", textTransform: "uppercase", marginBottom: "4px" }}>
      Tags
    </div>
    {tagCounts.map(({ tag, count }) => (
      <a
        key={tag}
        href={`/?tag=${tag}`}
        style={{
          color: selectedTag === tag ? "#00ff41" : "#888",
          textDecoration: "none",
          fontSize: "12px",
          display: "block",
          padding: "2px 0 2px 8px",
          borderLeft: selectedTag === tag ? "2px solid #00ff41" : "2px solid transparent",
        }}
      >
        {tag} ({count})
      </a>
    ))}
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: add bookmark and tag filter sections to sidebar"
```

---

## Task 14: Wire Up Home Page with Metadata Filtering

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/session-list.tsx`

- [ ] **Step 1: Read both files**

Read `src/app/page.tsx` and `src/components/session-list.tsx` for the current data flow.

- [ ] **Step 2: Update home page to fetch metadata and support new filters**

In `src/app/page.tsx`:
- Add `import { getAllSessionMetadata, getAllTags } from "@/lib/session-metadata";`
- Add `bookmarked` and `tag` to the searchParams destructuring
- Fetch metadata: `const allMetadata = await getAllSessionMetadata();`
- Apply bookmark filter: if `bookmarked === "true"`, filter sessions to only those with `allMetadata[session.id]?.bookmarked === true`
- Apply tag filter: if `tag` is present, filter sessions to only those whose `allMetadata[session.id]?.tags` includes the tag
- Compute `bookmarkCount` and `tagCounts` for the sidebar
- Pass metadata and filter state to `SessionList`

- [ ] **Step 3: Update SessionList to pass metadata to rows and sidebar**

In `src/components/session-list.tsx`:
- Accept new props: `allMetadata`, `bookmarkCount`, `tagCounts`, `selectedTag`, `showBookmarked`
- Pass `bookmarkCount`, `tagCounts`, `selectedTag`, `showBookmarked` to `Sidebar`
- For each `SessionRow`, pass `bookmarked`, `tags`, `hasNotes`, and `returnUrl` from the metadata

- [ ] **Step 4: Verify filtering works**

Run: `npm run dev`
- Bookmark a session (from detail page) → navigate to `/?bookmarked=true` → only bookmarked sessions appear
- Tag a session → navigate to `/?tag=<tag>` → only tagged sessions appear
- Sidebar shows correct counts

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/session-list.tsx
git commit -m "feat: wire up metadata filtering on home page"
```

---

## Task 15: More Actions Menu on Session Row

**Files:**
- Modify: `src/components/session-row.tsx`

- [ ] **Step 1: Add a `⋯` button with `<details>` dropdown**

After the existing copy button, add:
```tsx
<details data-more-actions style={{ position: "relative", display: "inline-block" }}>
  <summary
    style={{
      cursor: "pointer",
      color: "#555",
      fontSize: "14px",
      listStyle: "none",
      padding: "0 4px",
    }}
  >
    ⋯
  </summary>
  <div
    style={{
      position: "absolute",
      right: 0,
      top: "100%",
      background: "#111",
      border: "1px solid #333",
      borderRadius: "3px",
      padding: "4px 0",
      zIndex: 10,
      minWidth: "140px",
    }}
  >
    <button data-copy-action={`cd "${projectPath}"`} data-copy-label="cd command"
      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#888", padding: "4px 12px", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}>
      Terminal
    </button>
    <button data-copy-action={`code "${projectPath}"`} data-copy-label="code command"
      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#888", padding: "4px 12px", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}>
      VS Code
    </button>
  </div>
</details>
```

- [ ] **Step 2: Add inline script for event handling**

Add an inline script that:
1. Prevents click events on the `<details>` from propagating to the parent `<Link>`
2. Wires up `data-copy-action` buttons inside the dropdown to `window.__copyToClipboard`

```tsx
<script dangerouslySetInnerHTML={{ __html: `
(function() {
  document.querySelectorAll('details[data-more-actions]').forEach(function(d) {
    d.addEventListener('click', function(e) { e.stopPropagation(); });
    d.querySelectorAll('[data-copy-action]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var text = e.currentTarget.getAttribute('data-copy-action');
        var label = e.currentTarget.getAttribute('data-copy-label');
        if (window.__copyToClipboard) window.__copyToClipboard(text, label);
        d.removeAttribute('open');
      });
    });
  });
})();
`}} />
```

Note: be careful to scope this script narrowly — use a unique class or data attribute on the more-actions `<details>` to avoid conflicting with other `<details>` elements (like repo tree in sidebar).

- [ ] **Step 3: Update grid columns if needed**

The current grid has 8 columns. If the `⋯` menu needs its own column, expand the grid template. Otherwise, place it in the same column as the copy button.

- [ ] **Step 4: Verify dropdown works**

Run: `npm run dev`
Click `⋯` on a session row → dropdown appears. Click "Terminal" → command copied, dropdown closes. Clicking the `⋯` should NOT navigate to the session detail.

- [ ] **Step 5: Commit**

```bash
git add src/components/session-row.tsx
git commit -m "feat: add more-actions dropdown menu to session rows"
```

---

## Task 16: Run All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All existing tests PASS plus the new `session-metadata.test.ts` tests.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Fix any issues found**

If tests fail or build errors occur, fix them before proceeding.

- [ ] **Step 4: Commit any fixes**

```bash
# Stage only the specific files that were fixed
git add <fixed-files>
git commit -m "fix: resolve test/build issues"
```

---

## Task 17: Manual Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test bookmarks**

1. Navigate to a session detail page
2. Click the ☆ bookmark star → should turn ★ (amber)
3. Navigate home → session row shows ★
4. Click "Bookmarked" in sidebar → only bookmarked sessions shown
5. Unbookmark → star returns to ☆

- [ ] **Step 3: Test tags**

1. On a session detail page, type "deploy-fix" in the tag input, click +
2. Tag pill appears with color
3. Add a second tag "auth"
4. Navigate home → tags visible on the row
5. Click tag in sidebar → filters correctly
6. Click × on a tag pill → tag removed

- [ ] **Step 4: Test notes**

1. On a session detail page, expand "Notes" section
2. Type a note, click Save
3. Verify note persists after page reload
4. Note icon (✎) appears on the session row

- [ ] **Step 5: Test quick actions**

1. On session detail, click each action button: Resume, Terminal, VS Code, Summary
2. Verify each copies the correct text (paste to verify)
3. Click Export → verify .md file downloads

- [ ] **Step 6: Test more-actions menu on rows**

1. On home page, click ⋯ on a session row
2. Dropdown appears without navigating
3. Click "Terminal" → command copied, dropdown closes
