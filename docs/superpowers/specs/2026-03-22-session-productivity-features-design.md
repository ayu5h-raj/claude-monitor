# Session Productivity Features — Design Spec

**Date:** 2026-03-22
**Status:** Draft
**Scope:** Session Bookmarks/Tags, Session Notes, Quick Actions Hub

---

## Overview

Add three workflow productivity features to claude-monitor that transform it from a read-only viewer into an actionable dashboard. Users can bookmark important sessions, tag them for organization, attach freeform notes, and perform quick actions (resume, open in editor, export) directly from the UI.

## Architectural Constraints

claude-monitor reads from `~/.claude/` (read-only). User-generated metadata (bookmarks, tags, notes) must be stored separately. The project avoids client components due to a Next.js 16 + Turbopack hydration issue — all interactivity uses server actions, native HTML (`<details>`, `<form>`), and inline `<script>` tags.

### Prerequisite: Verify Server Actions Work

Server actions have never been used in this project. Before building all features on top of them, **Step 0** must validate that `<form action={serverAction}>` works correctly with Next.js 16 + Turbopack. Build a minimal proof-of-concept (e.g., a form that writes a test file). If server actions are broken, fall back to plain `<form action="/api/..." method="POST">` with API routes.

### Prerequisite: Fix Session Detail Date Handling

The session detail page (`/sessions/[id]/page.tsx`) currently uses `Date` objects and `toLocaleTimeString()`, violating project conventions. Before adding new features to this page, fix it:
- Serialize `startedAt`/`lastActiveAt` to ISO strings before rendering
- Replace `toLocaleTimeString()`/`toLocaleDateString()` with ISO string slicing

---

## 1. Data Layer — Session Metadata Store

### Storage

**File:** `~/.claude-monitor/session-metadata.json`

```json
{
  "sessions": {
    "session-id-abc123": {
      "bookmarked": true,
      "tags": ["deploy-fix", "auth"],
      "notes": "Fixed the OAuth redirect bug for PR #42",
      "updatedAt": "2026-03-22T10:30:00Z"
    }
  }
}
```

The directory `~/.claude-monitor/` is created via `fs.mkdir(dir, { recursive: true })` on first write. Missing file = empty metadata.

### New Module: `lib/session-metadata.ts`

**Read functions (server-only):**
- `getSessionMetadata(sessionId: string): SessionMetadata | null` — reads via `getAllSessionMetadata()` (uses cache)
- `getAllSessionMetadata(): Record<string, SessionMetadata>` — reads the full file, cached with 30s TTL (same pattern as session list cache). All sidebar counting (`getAllTags()`, bookmark counts) must go through this function.
- `getAllTags(): string[]` — calls `getAllSessionMetadata()`, deduplicates and sorts all tags

**Write functions (called from server actions):**
- `setBookmark(sessionId: string, bookmarked: boolean): void` — toggle bookmark
- `setTags(sessionId: string, tags: string[]): void` — replace tags for a session
- `addTag(sessionId: string, tag: string): void` — append a tag
- `removeTag(sessionId: string, tag: string): void` — remove a tag
- `setNotes(sessionId: string, notes: string): void` — set/update notes

**Atomic writes:** All write functions read the file, merge the change, write to a temp file in the same directory, then `fs.rename()` the temp file over the original (atomic on POSIX). Cache is invalidated after write.

**Concurrent writes:** Accepted as a known limitation for v1 (single-user tool). The last write wins. If this causes issues in practice, a file lock can be added later.

### Types

```typescript
interface SessionMetadata {
  bookmarked?: boolean;
  tags?: string[];
  notes?: string;
  updatedAt: string; // ISO timestamp
}
```

---

## 2. Session Bookmarks & Tags

### Session Row (Home Page)

- **Bookmark toggle:** Star icon (☆/★) rendered as a `<form>` with hidden inputs for `sessionId` and `returnUrl` (the full current URL including query params). Submit button styled as the star. Server action toggles the bookmark and redirects back to `returnUrl`.
- **Tags display:** Shown as small colored pills after the session info. Tag color derived by hashing the tag string (`charCodeAt` sum mod palette length) into the terminal palette: `[#00ff41, #ffaa00, #00aaff, #aa88ff, #ff4444]`.
- **Filter support:**
  - `?bookmarked=true` — show only bookmarked sessions
  - `?tag=deploy-fix` — show only sessions with that tag
  - Sidebar gets a "Bookmarked" link (with count) and a "Tags" section listing all tags with counts

### Session Detail Page (`/sessions/[id]`)

- **Bookmark toggle** in the header area, same form-based approach
- **Tag management section:**
  - Existing tags as pills, each with a `×` button (a `<form>` that removes that tag)
  - Add tag: `<form>` with a text `<input>` and submit button. Input placeholder shows "Add tag..."
  - **Tag validation rules:**
    - Lowercase, alphanumeric + hyphens only
    - Max 30 characters per tag
    - Max 10 tags per session
    - On validation failure: redirect back with `?error=invalid-tag` query param, page renders an inline error message

### Server Actions: `src/app/actions/metadata.ts`

```typescript
"use server";

async function toggleBookmark(formData: FormData): Promise<void>
async function addTagAction(formData: FormData): Promise<void>
async function removeTagAction(formData: FormData): Promise<void>
async function saveNotesAction(formData: FormData): Promise<void>
```

Each action reads form data (including a hidden `returnUrl` field), calls the appropriate `lib/session-metadata.ts` function, and uses `redirect(returnUrl)` to return to the referring page with full query params preserved.

**Note:** `redirect()` triggers a full page navigation, which resets scroll position. This is accepted for v1. If UX is poor in practice, we can explore `revalidatePath()` as an alternative.

---

## 3. Session Notes

### Session Detail Page

- **Location:** Below the metadata box, above the conversation entries
- **Display:** `<details>/<summary>` element. Summary shows "Notes" with a preview of the first line (or "No notes" if empty).
- **Edit:** Inside the details, a `<form>` with:
  - `<textarea>` (4 rows, full width) pre-filled with existing notes
  - "Save" submit button
  - Server action `saveNotesAction` writes to the metadata store

### Session Row (Home Page)

- If a session has notes, show a small note icon (similar to the bookmark star)
- CSS tooltip on hover shows the first 100 characters of the notes (same `::after` pseudo-element pattern used by the contribution heatmap)

---

## 4. Quick Actions Hub

### Prerequisite: Consolidate Toast/Clipboard Code

The toast/clipboard inline script is currently duplicated between `session-list.tsx` and `sessions/[id]/page.tsx`. Before adding more clipboard actions, extract the utilities into a shared inline script in `layout.tsx` that exposes `window.__showCopyToast(msg)` and `window.__copyToClipboard(text, label)` globally.

### Session Detail Page — Action Bar

Rendered below the header, as a horizontal row of action buttons. Each button is styled consistently with the terminal theme (bordered, monospace, hover highlight).

| Action | Label | Behavior |
|--------|-------|----------|
| Resume session | `[Resume]` | Copy `claude --resume <sessionId>` to clipboard |
| Open in terminal | `[Terminal]` | Copy `cd <projectPath>` to clipboard |
| Open in VS Code | `[VS Code]` | Copy `code <projectPath>` to clipboard |
| Copy summary | `[Summary]` | Copy formatted text block (see below) |
| Export as Markdown | `[Export]` | Navigate to `/api/export/[id]` which returns a `.md` file download |

**Copy Summary format:**
```
Session: <short-id>
Project: <project-name>
Branch: <branch>
Duration: <duration>
Files changed: <count>
Tokens: <total>
---
<first-message-truncated-to-200-chars>
```

### Export API Route: `src/app/api/export/[id]/route.ts`

- Reads the session detail (entries + metadata)
- Returns with `Content-Disposition: attachment; filename="session-<short-id>.md"` header
- Content-Type: `text/markdown`

**Export markdown structure:**
```markdown
# Session <short-id>

**Project:** <name>
**Branch:** <branch>
**Started:** <ISO timestamp>
**Duration:** <duration>
**Model:** <model>
**Tokens:** <total> (input: <n>, output: <n>)
**Files changed:** <list>

---

## Conversation

### User — <timestamp>
<message content>

### Assistant — <timestamp>
<text content>

#### Tool: <tool-name>
**Input:**
```json
<truncated to 500 chars if longer>
```

**Result:**
<truncated to 500 chars if longer>
```

### Session Row (Home Page) — More Actions Menu

- Add a `⋯` button next to the existing resume button
- The `⋯` button uses an inline `<script>` with `e.preventDefault(); e.stopPropagation()` to prevent the parent `<Link>` from navigating (same pattern as the existing resume button)
- Clicking toggles a `<details>` dropdown with actions: Terminal, VS Code, Summary
- Export is omitted from the row (too heavy for a list item)

---

## 5. Sidebar Enhancements

### New Sections

Below the existing repository list:

```
Bookmarked (3)
Tags
  deploy-fix (2)
  auth (1)
  feature (4)
```

- "Bookmarked" links to `/?bookmarked=true`
- Each tag links to `/?tag=<tag>`
- Counts reflect number of matching sessions
- Active filter highlighted in green (same pattern as selected repo)

---

## 6. Testing

### Unit Tests (vitest)

- `session-metadata.ts` — read/write/merge operations with temp files
- Atomic write — verify temp file + rename pattern
- Tag validation — lowercase, alphanumeric + hyphens, length limits
- `getAllTags()` — deduplication and sorting
- Export markdown formatting and truncation

### Manual Testing

- Bookmark toggle persists across page reloads
- Tags filter correctly via URL params
- Tag validation errors display correctly
- Notes save and display correctly
- Quick actions copy correct commands to clipboard
- Export downloads valid markdown file
- Sidebar counts update after bookmark/tag changes
- `returnUrl` preserves all query params after form submissions

---

## 7. Files to Create/Modify

### New Files
- `lib/session-metadata.ts` — metadata store module
- `src/app/actions/metadata.ts` — server actions (or API routes if server actions fail validation)
- `src/app/api/export/[id]/route.ts` — markdown export endpoint
- `src/components/quick-actions.tsx` — action bar (server component)
- `src/components/tag-pills.tsx` — tag display component (server component)
- `src/components/bookmark-button.tsx` — bookmark toggle (server component with form)
- `src/components/session-notes.tsx` — notes section (server component with form)
- `__tests__/session-metadata.test.ts` — unit tests

### Modified Files
- `src/app/sessions/[id]/page.tsx` — fix date handling, add bookmark, tags, notes, quick actions
- `src/components/session-row.tsx` — add bookmark star, tag pills, notes icon, more-actions menu
- `src/components/session-list.tsx` — pass metadata to rows, consolidate toast script
- `src/components/sidebar.tsx` — add bookmarks/tags sections
- `src/app/page.tsx` — read metadata, support new URL params
- `src/app/layout.tsx` — shared toast/clipboard inline script
- `lib/types.ts` — add `SessionMetadata` type

---

## 8. Known Limitations (v1)

- **Scroll position lost** after bookmark/tag toggle on home page (full page redirect)
- **Last-write-wins** on concurrent metadata writes (single-user, acceptable)
- **No tag autocomplete** — type the full tag name
- **No orphan cleanup** — metadata for deleted sessions accumulates (negligible size)
- **No search across conversation content** (separate future feature)

---

## Non-Goals

- No real-time/live features (deferred to future)
- No multi-user support
- No search across conversation content (separate feature)
- No tag autocompletion (keep it simple for v1)
