# Approach C: Full Streaming Architecture (Suspense)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate perceived navigation lag with terminal-themed loading states, optimize data fetching, AND add Suspense streaming so page sections render independently as their data arrives.

**Architecture:** All of Approach B (loading.tsx files, data parallelization, cache improvements), plus: heavy pages (home, session detail) are decomposed into independent async server components wrapped in `<Suspense>` boundaries. Each zone fetches its own data and streams in when ready. Simple pages (stats, files, tools, config) use a single Suspense around their content.

**Tech Stack:** Next.js 16 App Router, React Suspense, React Server Components, CSS animations, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-23-navigation-ux-loading-states-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/terminal-loader.tsx` | Shared server component: progress bar + centered terminal loading block |
| `src/app/loading.tsx` | Home page loading state — two-column layout placeholder |
| `src/app/sessions/[id]/loading.tsx` | Session detail loading state — three-panel IDE layout placeholder |
| `src/app/stats/loading.tsx` | Simple centered loader (imports TerminalLoader) |
| `src/app/files/loading.tsx` | Simple centered loader (imports TerminalLoader) |
| `src/app/tools/loading.tsx` | Simple centered loader (imports TerminalLoader) |
| `src/app/config/loading.tsx` | Simple centered loader (imports TerminalLoader) |
| `src/app/error.tsx` | Global error boundary — client component |
| `src/app/sessions/[id]/error.tsx` | Session-specific error boundary — client component |
| `src/components/async-sidebar.tsx` | Home sidebar — async server component with own data fetching |
| `src/components/async-session-list.tsx` | Home session list — async server component with own data fetching |
| `src/components/async-ide-sidebar.tsx` | Session detail sidebar — async server component with own data fetching |
| `src/components/async-conversation.tsx` | Session conversation — async server component with own data fetching |
| `src/components/async-terminal-dock.tsx` | Session terminal dock — async server component wrapper |

### Modified Files
| File | Change |
|------|--------|
| `src/app/page.tsx` | Wrap sidebar + session list in independent Suspense zones |
| `src/app/sessions/[id]/page.tsx` | Wrap IDE panels in independent Suspense zones with `key={id}` |
| `src/app/stats/page.tsx` | Wrap content in Suspense |
| `src/app/files/page.tsx` | Wrap content in Suspense |
| `src/app/tools/page.tsx` | Wrap content in Suspense |
| `src/app/config/page.tsx:81-82` | Parallelize + wrap in Suspense |
| `lib/claude-data.ts:29-32` | Increase sessionDetailCache TTL from 300s to 600s |
| `server.ts:148-150` | Add cache pre-warm call after server listen() |

---

### Task 1: Create shared TerminalLoader component

**Files:**
- Create: `src/components/terminal-loader.tsx`

- [ ] **Step 1: Create the TerminalLoader server component**

This is the shared loading UI used by simple pages and as Suspense fallbacks.

```tsx
// src/components/terminal-loader.tsx

const progressBarStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "3px",
  zIndex: 9999,
  background: "linear-gradient(90deg, transparent 0%, #00ff41 50%, transparent 100%)",
  backgroundSize: "200% 100%",
  animation: "loadingBar 1.5s ease-in-out infinite",
};

const containerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
  fontFamily: "monospace",
  color: "#00ff41",
};

const innerStyle = {
  textAlign: "center" as const,
  fontSize: "13px",
  lineHeight: "2",
};

const mutedStyle = {
  color: "#555555",
  fontSize: "11px",
};

export function ProgressBar() {
  return (
    <>
      <style>{`@keyframes loadingBar { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      <div style={progressBarStyle} />
    </>
  );
}

export function SidebarPlaceholder({ width = "300px" }: { width?: string }) {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div style={{
      width,
      minWidth: width,
      borderRight: "1px solid #222222",
      padding: "12px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
    }}>
      <div style={{ fontSize: "10px", color: "#555555", textTransform: "uppercase" as const }}>repos</div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid #1a1a1a" }}>
          <div style={barStyle(i % 2 === 0 ? "80%" : "60%")} />
        </div>
      ))}
    </div>
  );
}

export function SessionListPlaceholder() {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div style={{ flex: 1, padding: "12px 16px" }}>
      <div style={{ color: "#00ff41", fontSize: "12px", marginBottom: "12px", fontFamily: "monospace" }}>
        &gt; loading sessions...<span style={{ animation: "blink 1s step-end infinite" }}>_</span>
      </div>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #1a1a1a", display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#222222" }} />
          <div style={barStyle("120px")} />
          <div style={barStyle("80px")} />
          <div style={barStyle("60px")} />
          <div style={{ marginLeft: "auto", ...barStyle("40px") }} />
        </div>
      ))}
    </div>
  );
}

export function IdeSidebarPlaceholder() {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-section" style={{ padding: "8px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={barStyle(i % 2 === 0 ? "80%" : "60%")} />
          ))}
        </div>
      </div>
      <div className="ide-sidebar-section" style={{ padding: "6px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...barStyle("100%"), height: "28px" }} />
          ))}
        </div>
      </div>
      <div className="ide-sidebar-section" style={{ padding: "8px 14px" }}>
        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: "6px" }}>Tags</div>
        <div style={barStyle("60%")} />
      </div>
    </div>
  );
}

export function ConversationPlaceholder() {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div className="ide-center" style={{ padding: "16px" }}>
      <div style={{ color: "#00ff41", fontSize: "12px", marginBottom: "16px", fontFamily: "monospace" }}>
        &gt; loading conversation...<span style={{ animation: "blink 1s step-end infinite" }}>_</span>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ marginBottom: "16px", padding: "12px", borderLeft: `2px solid ${i % 2 === 0 ? "#151515" : "#0a1a0a"}` }}>
          <div style={{ ...barStyle(i % 2 === 0 ? "40%" : "30%"), marginBottom: "8px" }} />
          <div style={barStyle("90%")} />
          <div style={{ ...barStyle("70%"), marginTop: "4px" }} />
          <div style={{ ...barStyle("50%"), marginTop: "4px" }} />
        </div>
      ))}
    </div>
  );
}

export function DockPlaceholder() {
  return (
    <details className="ide-dock">
      <summary>
        <span className="ide-dock-label">TERMINAL</span>
        <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--text-muted)" }} />
        <span className="ide-dock-hint" style={{ color: "var(--text-muted)" }}>loading...</span>
      </summary>
    </details>
  );
}

export default function TerminalLoader({ message = "loading" }: { message?: string }) {
  return (
    <>
      <ProgressBar />
      <div style={containerStyle}>
        <div style={innerStyle}>
          <div>&gt; {message}...</div>
          <div>
            <span style={{ color: "#00ff41" }}>{"████████░░░░░░░░"}</span>
          </div>
          <div style={mutedStyle}>
            awaiting response
            <span style={{ animation: "blink 1s step-end infinite" }}>_</span>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Commit**

```bash
git add src/components/terminal-loader.tsx
git commit -m "feat: add shared TerminalLoader and placeholder components for loading/Suspense states"
```

---

### Task 2: Create simple loading states (stats, files, tools, config)

**Files:**
- Create: `src/app/stats/loading.tsx`
- Create: `src/app/files/loading.tsx`
- Create: `src/app/tools/loading.tsx`
- Create: `src/app/config/loading.tsx`

- [ ] **Step 1: Create all four simple loading files**

`src/app/stats/loading.tsx`:
```tsx
import TerminalLoader from "@/src/components/terminal-loader";
export default function Loading() {
  return <TerminalLoader message="computing stats" />;
}
```

`src/app/files/loading.tsx`:
```tsx
import TerminalLoader from "@/src/components/terminal-loader";
export default function Loading() {
  return <TerminalLoader message="scanning files" />;
}
```

`src/app/tools/loading.tsx`:
```tsx
import TerminalLoader from "@/src/components/terminal-loader";
export default function Loading() {
  return <TerminalLoader message="analyzing tools" />;
}
```

`src/app/config/loading.tsx`:
```tsx
import TerminalLoader from "@/src/components/terminal-loader";
export default function Loading() {
  return <TerminalLoader message="reading config" />;
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Commit**

```bash
git add src/app/stats/loading.tsx src/app/files/loading.tsx src/app/tools/loading.tsx src/app/config/loading.tsx
git commit -m "feat: add terminal-themed loading states for stats, files, tools, config pages"
```

---

### Task 3: Create home page and session detail loading states

**Files:**
- Create: `src/app/loading.tsx`
- Create: `src/app/sessions/[id]/loading.tsx`

- [ ] **Step 1: Create layout-matching home loading state**

Height must be `calc(100vh - 45px)` matching `session-list.tsx` line 80. Include the 5px drag handle between sidebar and content.

```tsx
// src/app/loading.tsx
import { ProgressBar, SidebarPlaceholder, SessionListPlaceholder } from "@/src/components/terminal-loader";

export default function Loading() {
  return (
    <>
      <ProgressBar />
      <div style={{ display: "flex", height: "calc(100vh - 45px)", overflow: "hidden" }}>
        <SidebarPlaceholder />
        <div style={{ width: "5px", background: "var(--border)", flexShrink: 0 }} />
        <SessionListPlaceholder />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create IDE layout-matching session detail loading state**

```tsx
// src/app/sessions/[id]/loading.tsx
import { ProgressBar, IdeSidebarPlaceholder, ConversationPlaceholder, DockPlaceholder } from "@/src/components/terminal-loader";

const barStyle = (width: string) => ({
  height: "10px",
  borderRadius: "2px",
  background: "#151515",
  width,
  animation: "pulse 2s ease-in-out infinite",
});

export default function Loading() {
  return (
    <div className="ide-layout">
      <ProgressBar />
      {/* Header bar */}
      <div className="ide-header" style={{ position: "relative" }}>
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>&larr; back</span>
        <span style={{ color: "var(--border)" }}>|</span>
        <div style={barStyle("120px")} />
        <div style={barStyle("60px")} />
        <div style={barStyle("50px")} />
      </div>
      {/* Main area */}
      <div className="ide-main">
        <IdeSidebarPlaceholder />
        <div id="ide-sidebar-drag" className="ide-sidebar-drag">{" "}</div>
        <ConversationPlaceholder />
      </div>
      <DockPlaceholder />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 4: Commit**

```bash
git add src/app/loading.tsx "src/app/sessions/[id]/loading.tsx"
git commit -m "feat: add layout-matching loading states for home and session detail pages"
```

---

### Task 4: Create error boundaries

**Files:**
- Create: `src/app/error.tsx`
- Create: `src/app/sessions/[id]/error.tsx`

- [ ] **Step 1: Create global error boundary**

Per Next.js 16, `error.tsx` must be `'use client'` and uses `unstable_retry`.

```tsx
// src/app/error.tsx
"use client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      fontFamily: "monospace",
    }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <div style={{ color: "#ff4444", fontSize: "14px", marginBottom: "8px" }}>
          error: something went wrong
        </div>
        <div style={{ color: "#555555", fontSize: "12px", marginBottom: "16px" }}>
          {error.digest ? `[digest: ${error.digest}]` : error.message}
        </div>
        <button
          onClick={() => unstable_retry()}
          style={{
            background: "transparent",
            border: "1px solid #333",
            color: "#00ff41",
            padding: "6px 16px",
            fontFamily: "monospace",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          [ retry ]
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create session-specific error boundary**

```tsx
// src/app/sessions/[id]/error.tsx
"use client";

import Link from "next/link";

export default function SessionError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      fontFamily: "monospace",
    }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <div style={{ color: "#ff4444", fontSize: "14px", marginBottom: "8px" }}>
          error: failed to load session
        </div>
        <div style={{ color: "#555555", fontSize: "12px", marginBottom: "16px" }}>
          {error.digest ? `[digest: ${error.digest}]` : "The session file may be corrupt or missing."}
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => unstable_retry()}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#00ff41",
              padding: "6px 16px",
              fontFamily: "monospace",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            [ retry ]
          </button>
          <Link
            href="/"
            style={{
              border: "1px solid #333",
              color: "#888",
              padding: "6px 16px",
              fontSize: "12px",
            }}
          >
            [ back to sessions ]
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 4: Commit**

```bash
git add src/app/error.tsx "src/app/sessions/[id]/error.tsx"
git commit -m "feat: add terminal-themed error boundaries for graceful error handling"
```

---

### Task 5: Data layer optimizations

**Files:**
- Modify: `src/app/config/page.tsx:81-82`
- Modify: `lib/claude-data.ts:29-32`
- Modify: `server.ts:148-150`

- [ ] **Step 1: Run existing tests to establish baseline**

Run: `npm test`
Expected: All 102 tests pass

- [ ] **Step 2: Add in-flight request deduplication for getSessionDetail**

In the Suspense architecture, `AsyncIdeSidebar`, `AsyncConversation`, and `AsyncTerminalDock` all call `getSessionDetail(id)` concurrently. On a cold cache, all three would parse the same JSONL file simultaneously. Add a deduplication map so concurrent callers share a single in-flight promise.

In `lib/claude-data.ts`, add after the cache declarations (around line 33):

```typescript
// Deduplication map for concurrent getSessionDetail calls
const inFlightDetailRequests = new Map<string, Promise<{ session: Session; entries: SessionEntry[]; codeImpact: CodeImpact } | null>>();
```

Then wrap the `getSessionDetail` function body: at the start, check if there's already an in-flight request for this ID. If so, return the same promise. If not, create the promise, store it, and clean up when it resolves.

The implementer should wrap the existing function body like:
```typescript
export async function getSessionDetail(id: string) {
  const existing = inFlightDetailRequests.get(id);
  if (existing) return existing;

  const promise = (async () => {
    // ... existing implementation ...
  })();

  inFlightDetailRequests.set(id, promise);
  try {
    return await promise;
  } finally {
    inFlightDetailRequests.delete(id);
  }
}
```

This ensures three concurrent `getSessionDetail("abc")` calls result in one file read + parse, not three.

- [ ] **Step 3: Parallelize config page fetches**

In `src/app/config/page.tsx`, replace lines 81-82:

**Current:**
```typescript
  const config = await getGlobalConfig();
  const repoConfigs = await getRepoConfigs();
```

**Replace with:**
```typescript
  const [config, repoConfigs] = await Promise.all([
    getGlobalConfig(),
    getRepoConfigs(),
  ]);
```

- [ ] **Step 3: Extend session detail cache TTL**

In `lib/claude-data.ts`, change line 29-32 from `300_000` to `600_000`:

**Current:**
```typescript
const sessionDetailCache = new TTLCache<{
  entries: SessionEntry[];
  mtime: number;
}>(300_000);
```

**Replace with:**
```typescript
const sessionDetailCache = new TTLCache<{
  entries: SessionEntry[];
  mtime: number;
}>(600_000);
```

- [ ] **Step 4: Add cache pre-warm on server startup**

In `server.ts`, add import after line 8:
```typescript
import { getAllSessions } from "./lib/claude-data";
```

Modify `server.listen` callback (around line 148):
```typescript
  server.listen(port, () => {
    console.log(`> claude-monitor ready on http://${hostname}:${port}`);
    // Pre-warm session list cache for faster first navigation
    getAllSessions().catch(() => {});
  });
```

- [ ] **Step 5: Verify tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/app/config/page.tsx lib/claude-data.ts server.ts
git commit -m "perf: parallelize config fetches, extend cache TTL, pre-warm cache on startup"
```

---

### Task 6: Extract async sidebar component for home page

**Files:**
- Create: `src/components/async-sidebar.tsx`

- [ ] **Step 1: Create async sidebar component**

This component fetches its own data (`getProjects`, `getAllSessionMetadata`, `getStats`) and renders the sidebar. It must accept the same URL filter props that the current `Sidebar` component receives.

Read the current `src/app/page.tsx` to understand what data the sidebar needs:
- `repos` (from `getProjects()`)
- `bookmarkCount` and `tagCounts` (derived from `getAllSessionMetadata()`)
- `todayStats` (derived from `getStats()`)
- `selectedRepo`, `selectedBranch`, `selectedTag`, `showBookmarked` (from URL search params)

```tsx
// src/components/async-sidebar.tsx
import { getProjects, getStats } from "@/lib/claude-data";
import { getAllSessionMetadata } from "@/lib/session-metadata";
import Sidebar from "@/src/components/sidebar";

interface AsyncSidebarProps {
  selectedRepo?: string;
  selectedBranch?: string;
  selectedTag?: string;
  showBookmarked?: boolean;
}

export default async function AsyncSidebar({
  selectedRepo,
  selectedBranch,
  selectedTag,
  showBookmarked,
}: AsyncSidebarProps) {
  const [repos, allMetadata, stats] = await Promise.all([
    getProjects(),
    getAllSessionMetadata(),
    getStats(),
  ]);

  const serializedRepos = repos.map((r) => ({
    ...r,
    lastActiveAt: r.lastActiveAt.toISOString(),
    worktrees: r.worktrees.map((wt) => ({
      ...wt,
      lastActiveAt: wt.lastActiveAt.toISOString(),
    })),
  }));

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayActivity = stats?.dailyActivity.find((d) => d.date === todayStr);
  const todayModelTokens = stats?.dailyModelTokens.find((d) => d.date === todayStr);
  const todayTokens = todayModelTokens
    ? Object.values(todayModelTokens.tokensByModel).reduce((a, b) => a + b, 0)
    : 0;

  const todayStats = {
    sessions: todayActivity?.sessionCount ?? 0,
    tokens: todayTokens,
    toolCalls: todayActivity?.toolCallCount ?? 0,
  };

  const bookmarkCount = Object.values(allMetadata).filter((m) => m.bookmarked).length;
  const tagCountMap = new Map<string, number>();
  for (const meta of Object.values(allMetadata)) {
    for (const t of meta.tags || []) {
      tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1);
    }
  }
  const tagCounts = Array.from(tagCountMap.entries())
    .map(([t, count]) => ({ tag: t, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return (
    <Sidebar
      repos={serializedRepos}
      selectedRepo={selectedRepo}
      selectedBranch={selectedBranch}
      todayStats={todayStats}
      bookmarkCount={bookmarkCount}
      tagCounts={tagCounts}
      selectedTag={selectedTag}
      showBookmarked={showBookmarked}
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Commit**

```bash
git add src/components/async-sidebar.tsx
git commit -m "feat: extract AsyncSidebar component with independent data fetching"
```

---

### Task 7: Extract async session list component for home page

**Files:**
- Create: `src/components/async-session-list.tsx`

- [ ] **Step 1: Create async session list component**

This component fetches session data, applies filters, runs search, and renders the session rows. Read `src/app/page.tsx` and `src/components/session-list.tsx` to understand the full data flow.

This component must render everything that `SessionList` currently renders EXCEPT the `<Sidebar>` and the sidebar drag handle. Specifically it must include:
- Search form (`session-list.tsx` lines 115-176)
- Filter breadcrumb (`session-list.tsx` lines 179-220)
- Column headers (`session-list.tsx` lines 223-249)
- Session rows or search results (`session-list.tsx` lines 252-302)

It also needs `getAllSessionMetadata()` for bookmark/tag filtering and `getStats()` for `todayStats` (currently passed to sidebar but computed in page.tsx).

```tsx
// src/components/async-session-list.tsx
import { getAllSessions } from "@/lib/claude-data";
import { getAllSessionMetadata } from "@/lib/session-metadata";
import { searchSessions } from "@/lib/search";
import SessionRow from "@/src/components/session-row";
import SearchResults from "@/src/components/search-results";

interface AsyncSessionListProps {
  selectedRepo?: string;
  selectedBranch?: string;
  showBookmarked?: boolean;
  selectedTag?: string;
  searchQuery?: string;
  repos: { name: string; path: string }[];
}

export default async function AsyncSessionList({
  selectedRepo,
  selectedBranch,
  showBookmarked,
  selectedTag,
  searchQuery,
  repos,
}: AsyncSessionListProps) {
  const [sessions, allMetadata] = await Promise.all([
    getAllSessions(),
    getAllSessionMetadata(),
  ]);

  const serializedSessions = sessions.map((s) => ({
    ...s,
    startedAt: s.startedAt.toISOString(),
    lastActiveAt: s.lastActiveAt.toISOString(),
  }));

  // Filter (mirrors page.tsx lines 54-66)
  let filtered = serializedSessions;
  if (selectedRepo) filtered = filtered.filter((s) => s.projectPath === selectedRepo);
  if (selectedBranch) filtered = filtered.filter((s) => s.branch === selectedBranch);
  if (showBookmarked) filtered = filtered.filter((s) => allMetadata[s.id]?.bookmarked === true);
  if (selectedTag) filtered = filtered.filter((s) => allMetadata[s.id]?.tags?.includes(selectedTag));

  // Search
  const searchResults = searchQuery
    ? await searchSessions(searchQuery, {
        repo: selectedRepo || undefined,
        branch: selectedBranch || undefined,
        bookmarked: showBookmarked || undefined,
        tag: selectedTag || undefined,
      })
    : undefined;

  // Build returnUrl (mirrors session-list.tsx lines 66-71)
  const params: string[] = [];
  if (selectedRepo) params.push(`repo=${encodeURIComponent(selectedRepo)}`);
  if (selectedBranch) params.push(`branch=${encodeURIComponent(selectedBranch)}`);
  if (showBookmarked) params.push("bookmarked=true");
  if (selectedTag) params.push(`tag=${encodeURIComponent(selectedTag)}`);
  const returnUrl = params.length > 0 ? `/?${params.join("&")}` : "/";
  const clearSearchUrl = returnUrl;
  const hasFilter = selectedRepo || selectedBranch || showBookmarked || selectedTag || searchQuery;
  const selectedRepoName = repos.find((r) => r.path === selectedRepo)?.name;

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {/* Search bar — mirrors session-list.tsx lines 115-176 */}
      <form id="search-form" method="GET" action="/"
        style={{ padding: "6px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-secondary)" }}>
        {selectedRepo && <input type="hidden" name="repo" value={selectedRepo} />}
        {selectedBranch && <input type="hidden" name="branch" value={selectedBranch} />}
        {showBookmarked && <input type="hidden" name="bookmarked" value="true" />}
        {selectedTag && <input type="hidden" name="tag" value={selectedTag} />}
        <span id="search-prompt" style={{ color: "var(--text-muted)", fontSize: "12px" }}>$</span>
        <input type="text" name="q" defaultValue={searchQuery || ""} placeholder="search sessions..."
          style={{ flex: 1, background: "transparent", color: "var(--text-primary)", border: "none", outline: "none", fontSize: "12px", fontFamily: "inherit" }} />
        <button id="search-btn" type="submit"
          style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "3px", padding: "2px 8px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}>
          [search]
        </button>
        {searchQuery && <a href={clearSearchUrl} style={{ color: "var(--text-muted)", fontSize: "11px", textDecoration: "none" }}>[clear]</a>}
      </form>

      {/* Filter breadcrumb — mirrors session-list.tsx lines 179-220 */}
      {hasFilter && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
          <span>filter:</span>
          {selectedRepo && <span style={{ color: "var(--text-secondary)" }}>{selectedRepoName ?? selectedRepo}</span>}
          {selectedRepo && selectedBranch && <span style={{ color: "var(--text-muted)" }}>/</span>}
          {selectedBranch && <span style={{ color: "var(--text-secondary)" }}>{selectedBranch}</span>}
          {showBookmarked && <span style={{ color: "#ffaa00" }}>★ bookmarked</span>}
          {selectedTag && <span style={{ color: "var(--text-secondary)" }}>tag:{selectedTag}</span>}
          {searchQuery && <span style={{ color: "var(--green)" }}>search: &quot;{searchQuery}&quot;</span>}
        </div>
      )}

      {/* Column headers — mirrors session-list.tsx lines 223-249 */}
      <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 140px 80px 55px 60px 50px 80px 60px", gap: "0 12px", padding: "6px 16px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--bg-secondary)", position: "sticky", top: 0, zIndex: 1 }}>
        <span />
        <span>{selectedRepo ? "session" : "project"}</span>
        <span>branch</span>
        <span style={{ textAlign: "right" }}>tokens</span>
        <span style={{ textAlign: "right" }}>ctx</span>
        <span style={{ textAlign: "right" }}>tools</span>
        <span style={{ textAlign: "right" }}>files</span>
        <span style={{ textAlign: "right" }}>when</span>
        <span />
      </div>

      {/* Content — mirrors session-list.tsx lines 252-302 */}
      {searchQuery && searchResults ? (
        searchResults.length > 0 ? (
          <SearchResults results={searchResults} query={searchQuery} />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            no results for &quot;{searchQuery}&quot;
          </div>
        )
      ) : filtered.length > 0 ? (
        filtered.map((session) => {
          const meta = allMetadata[session.id];
          const notesText = meta?.notes || "";
          return (
            <SessionRow
              key={session.id}
              session={session}
              showSummary={!!selectedRepo}
              bookmarked={meta?.bookmarked}
              tags={meta?.tags}
              hasNotes={!!notesText}
              notesPreview={notesText ? notesText.slice(0, 80) : undefined}
              returnUrl={returnUrl}
              projectPath={session.projectPath}
            />
          );
        })
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px" }}>
          {hasFilter ? "no sessions match the current filter" : "no sessions found"}
        </div>
      )}
    </div>
  );
}
```

**Note:** `repos` is passed as a prop (simple serialized array) from the page shell — it's needed for `selectedRepoName` display. The page shell can derive this from `getProjects()` quickly, or pass it as a lightweight prop.

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors (may have type warnings — fix as needed)

- [ ] **Step 3: Commit**

```bash
git add src/components/async-session-list.tsx
git commit -m "feat: extract AsyncSessionList component with independent data fetching"
```

---

### Task 8: Rewrite home page with Suspense zones

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite page.tsx with Suspense boundaries**

Replace the entire `src/app/page.tsx` with Suspense-wrapped async components:

```tsx
// src/app/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { SidebarPlaceholder, SessionListPlaceholder } from "@/src/components/terminal-loader";
import { getProjects } from "@/lib/claude-data";
import AsyncSidebar from "@/src/components/async-sidebar";
import AsyncSessionList from "@/src/components/async-session-list";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; branch?: string; bookmarked?: string; tag?: string; q?: string }>;
}) {
  const { repo, branch, bookmarked, tag, q } = await searchParams;

  // Lightweight fetch for repo names (needed by AsyncSessionList for display)
  // This is fast since getProjects() internally uses the cached getAllSessions()
  const repos = await getProjects();
  const serializedRepos = repos.map((r) => ({ name: r.name, path: r.path }));

  return (
    <div style={{ display: "flex", height: "calc(100vh - 45px)", overflow: "hidden" }}>
      <Suspense fallback={<SidebarPlaceholder />}>
        <AsyncSidebar
          selectedRepo={repo}
          selectedBranch={branch}
          selectedTag={tag}
          showBookmarked={bookmarked === "true"}
        />
      </Suspense>

      {/* Drag handle for sidebar resize (matches session-list.tsx line 96-104) */}
      <div id="sidebar-drag" style={{ width: "5px", cursor: "col-resize", background: "var(--border)", flexShrink: 0 }} />

      <Suspense fallback={<SessionListPlaceholder />}>
        <AsyncSessionList
          selectedRepo={repo}
          selectedBranch={branch}
          showBookmarked={bookmarked === "true"}
          selectedTag={tag}
          searchQuery={q}
          repos={serializedRepos}
        />
      </Suspense>
    </div>
  );
}
```

**Note:** The page shell does a lightweight `getProjects()` call synchronously. This is fast because `getProjects()` uses the cached `getAllSessions()`. The trade-off: the page shell blocks briefly on this call before rendering Suspense zones, but it's necessary for the drag handle and repo name display.

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Manual test**

Run: `npm run dev`
Navigate to home page — sidebar and session list should stream in independently.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rewrite home page with independent Suspense zones for sidebar and session list"
```

---

### Task 9: Extract async components for session detail page

**Files:**
- Create: `src/components/async-ide-sidebar.tsx`
- Create: `src/components/async-conversation.tsx`
- Create: `src/components/async-terminal-dock.tsx`

- [ ] **Step 1: Create AsyncIdeSidebar**

This component fetches session metadata + config and renders the IDE sidebar section. Read `src/app/sessions/[id]/page.tsx` lines 177-385 to extract the sidebar JSX.

The implementer must:
1. Read the full session detail page to understand what data the sidebar needs
2. Extract lines 177-385 (the `.ide-sidebar` div and its contents) into this component
3. Fetch `getSessionDetail`, `getSessionMetadata`, `getGlobalConfig`, `getProjectConfig` internally
4. Derive all computed values (totalPlugins, totalSkills, totalMcpServers, etc.)

This component renders the full IDE sidebar from `sessions/[id]/page.tsx` lines 177-385. It needs these imports and computed values:

**Required imports:**
- `getSessionDetail` from `@/lib/claude-data`
- `getSessionMetadata` from `@/lib/session-metadata`
- `getGlobalConfig`, `getProjectConfig` from `@/lib/config-data`
- `formatTokenCount`, `formatDuration` from `@/lib/path-utils`
- `BookmarkButton` from `@/src/components/bookmark-button`
- `TagPills` from `@/src/components/tag-pills`
- `CodeImpactView` from `@/src/components/code-impact-view`
- `addTagAction`, `saveNotesAction` from `@/src/app/actions/metadata`
- `Link` from `next/link`

**Computed values needed (from page.tsx lines 36-86):**
- `totalPlugins` = `globalConfig.plugins.length`
- `totalSkills` = `globalConfig.skills.length + globalConfig.plugins.reduce((sum, p) => sum + p.skills.length, 0)`
- `totalMcpServers` = `globalConfig.mcpServers.length + projectConfig.mcpServers.length`
- `returnUrl` = `/sessions/${session.id}`
- `totalTokens` = sum of all token usage fields
- `durationMs` = `session.lastActiveAt.getTime() - session.startedAt.getTime()`
- `durationStr` = `formatDuration(durationMs)`
- `startedDate` / `startedTime` = ISO string slicing (no toLocaleTimeString!)
- `resumeCmd`, `cdCmd`, `codeCmd`, `summary` = string templates
- `notesPreview` = first line of notes, truncated

```tsx
// src/components/async-ide-sidebar.tsx
import Link from "next/link";
import { getSessionDetail } from "@/lib/claude-data";
import { getSessionMetadata } from "@/lib/session-metadata";
import { getGlobalConfig, getProjectConfig } from "@/lib/config-data";
import { formatTokenCount, formatDuration } from "@/lib/path-utils";
import { BookmarkButton } from "@/src/components/bookmark-button";
import { TagPills } from "@/src/components/tag-pills";
import { addTagAction, saveNotesAction } from "@/src/app/actions/metadata";
import CodeImpactView from "@/src/components/code-impact-view";

export default async function AsyncIdeSidebar({
  sessionId,
  error,
}: {
  sessionId: string;
  error?: string;
}) {
  // Two-stage parallel fetch (same pattern as Approach B)
  const [result, globalConfig] = await Promise.all([
    getSessionDetail(sessionId),
    getGlobalConfig(),
  ]);
  if (!result) return null;
  const { session, entries, codeImpact } = result;

  const [metadata, projectConfig] = await Promise.all([
    getSessionMetadata(session.id),
    getProjectConfig(session.projectPath),
  ]);

  // Compute all derived values (from page.tsx lines 36-86)
  const totalPlugins = globalConfig.plugins.length;
  const totalSkills = globalConfig.skills.length + globalConfig.plugins.reduce((sum, p) => sum + p.skills.length, 0);
  const totalMcpServers = globalConfig.mcpServers.length + projectConfig.mcpServers.length;
  const returnUrl = `/sessions/${session.id}`;
  const totalTokens = session.tokenUsage.input + session.tokenUsage.output + session.tokenUsage.cacheRead + session.tokenUsage.cacheCreation;
  const durationMs = session.lastActiveAt.getTime() - session.startedAt.getTime();
  const durationStr = formatDuration(durationMs);
  const startedIso = session.startedAt.toISOString();
  const startedDate = startedIso.slice(0, 10);
  const startedTime = startedIso.slice(11, 16);
  const resumeCmd = `cd "${session.projectPath}" && claude --resume ${session.id}`;
  const codeCmd = `code "${session.projectPath}"`;
  const shortId = session.id.slice(0, 8);
  const summary = [
    `Session: ${shortId}`, `Project: ${session.project}`, `Branch: ${session.branch}`,
    `Duration: ${durationStr}`, `Files changed: ${session.filesChanged.length}`,
    `Tokens: ${formatTokenCount(totalTokens)}`,
    session.firstMessage ? `---\n${session.firstMessage.slice(0, 200)}` : "",
  ].filter(Boolean).join("\n");
  const notesPreview = metadata?.notes ? metadata.notes.split("\n")[0].slice(0, 40) : "No notes";

  // Render sidebar JSX — copy from page.tsx lines 177-385
  // The implementer must copy the exact <div className="ide-sidebar"> content
  // from the current page.tsx, replacing variable references with the locally
  // computed values above. All variable names are identical, so it's a direct copy.
  return (
    <div className="ide-sidebar">
      {/* Copy lines 179-384 from sessions/[id]/page.tsx verbatim */}
      {/* All variables (startedDate, durationStr, totalTokens, resumeCmd, etc.) */}
      {/* are computed identically above — no changes needed to the JSX */}
    </div>
  );
}
```

**Key instruction for implementer:** Copy the entire `<div className="ide-sidebar">...</div>` content (lines 177-385) from `src/app/sessions/[id]/page.tsx` into this component's return. All variable names match — no JSX modifications needed. The only new prop is `error` for tag validation display.

- [ ] **Step 2: Create AsyncConversation**

```tsx
// src/components/async-conversation.tsx
import { getSessionDetail } from "@/lib/claude-data";
import ConversationEntry from "@/src/components/conversation-entry";
import LiveSession from "@/src/components/live-session";

export default async function AsyncConversation({ sessionId }: { sessionId: string }) {
  // Uses cached/deduplicated result from page shell's getSessionDetail call
  const result = await getSessionDetail(sessionId);
  if (!result) return null; // Shell already called notFound() — this is a safety fallback
  const { session, entries } = result;

  const serializedEntries = entries
    .map((e) => ({
      ...e,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
    }))
    .reverse();

  return (
    <div className="ide-center">
      {session.status === "active" ? (
        <LiveSession sessionId={session.id} initialEntries={serializedEntries} />
      ) : (
        <div>
          {serializedEntries.map((entry, i) => (
            <ConversationEntry key={`${entry.uuid}-${i}`} entry={entry} />
          ))}
          {serializedEntries.length === 0 && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "32px" }}>
              No conversation entries found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create AsyncTerminalDock**

```tsx
// src/components/async-terminal-dock.tsx
import { getSessionDetail } from "@/lib/claude-data";
import Terminal from "@/src/components/terminal";

export default async function AsyncTerminalDock({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) return null;
  const { session } = result;

  return (
    <details className="ide-dock">
      <summary>
        <span className="ide-dock-label">TERMINAL</span>
        <span
          id="terminal-status-dot"
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--text-muted)",
          }}
        />
        <span className="ide-dock-hint">
          claude --resume {session.id.slice(0, 8)}
        </span>
      </summary>
      <div id="ide-dock-drag" className="ide-dock-drag" />
      <div id="ide-dock-content" className="ide-dock-content">
        <Terminal sessionId={session.id} cwd={session.projectPath} />
      </div>
    </details>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 5: Commit**

```bash
git add src/components/async-ide-sidebar.tsx src/components/async-conversation.tsx src/components/async-terminal-dock.tsx
git commit -m "feat: extract async server components for session detail Suspense zones"
```

---

### Task 10: Rewrite session detail page with Suspense zones

**Files:**
- Modify: `src/app/sessions/[id]/page.tsx` (major rewrite)

- [ ] **Step 1: Rewrite page.tsx with Suspense boundaries**

The page becomes a thin shell that parses params and renders Suspense zones. Note `key={id}` on the conversation Suspense to force remount on same-route navigation.

The page shell must handle `notFound()` for missing sessions. Use `getSessionDetail()` in the shell — it's cached, so the async children reuse the same data. The header can render full session info because we have the data. `key={id}` on ALL Suspense zones forces remount on session-to-session navigation.

```tsx
// src/app/sessions/[id]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionDetail } from "@/lib/claude-data";
import { IdeSidebarPlaceholder, ConversationPlaceholder, DockPlaceholder } from "@/src/components/terminal-loader";
import { BookmarkButton } from "@/src/components/bookmark-button";
import AsyncIdeSidebar from "@/src/components/async-ide-sidebar";
import AsyncConversation from "@/src/components/async-conversation";
import AsyncTerminalDock from "@/src/components/async-terminal-dock";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  // Fetch in shell for notFound() + header display. Cached — children reuse same data.
  const result = await getSessionDetail(id);
  if (!result) notFound();
  const { session } = result;
  const shortId = session.id.slice(0, 8);
  const returnUrl = `/sessions/${session.id}`;
  const resumeCmd = `cd "${session.projectPath}" && claude --resume ${session.id}`;

  return (
    <div className="ide-layout">
      {/* Header — renders immediately with session data from shell */}
      <div className="ide-header" style={{ position: "relative" }}>
        <Link href="/" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          &larr; back
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <BookmarkButton sessionId={session.id} bookmarked={false} returnUrl={returnUrl} size="sm" />
        <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "bold" }}>
          {session.project}
        </span>
        {session.branch && (
          <span style={{ color: "var(--green)", fontSize: "12px" }}>{session.branch}</span>
        )}
        <span style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "monospace" }}>
          {shortId}
        </span>
        <span id="resume-copy-btn" data-cmd={resumeCmd}
          style={{ color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", padding: "2px 6px", border: "1px solid var(--border)", borderRadius: "3px", marginLeft: "auto" }}>
          [ copy resume cmd ]
        </span>
        <div className="ide-header-glow" />
      </div>

      {/* Main area — three independent Suspense zones, all keyed by id */}
      <div className="ide-main">
        <Suspense fallback={<IdeSidebarPlaceholder />} key={`sidebar-${id}`}>
          <AsyncIdeSidebar sessionId={id} />
        </Suspense>

        <div id="ide-sidebar-drag" className="ide-sidebar-drag">{" "}</div>

        <Suspense fallback={<ConversationPlaceholder />} key={`conv-${id}`}>
          <AsyncConversation sessionId={id} />
        </Suspense>
      </div>

      {/* Terminal dock — independent zone */}
      <Suspense fallback={<DockPlaceholder />} key={`dock-${id}`}>
        <AsyncTerminalDock sessionId={id} />
      </Suspense>
    </div>
  );
}
```

**Design notes:**
- The shell calls `getSessionDetail(id)` for `notFound()` handling and header display. Thanks to the in-flight deduplication (Task 5 Step 2), the concurrent calls from `AsyncIdeSidebar`, `AsyncConversation`, and `AsyncTerminalDock` reuse the same cached result.
- `key={...id}` on ALL three Suspense boundaries forces remount when navigating between sessions.
- The header renders with full session info (project name, branch, bookmark, copy cmd) immediately.
- `searchParams.error` is preserved for tag validation error display (handled by AsyncIdeSidebar).

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Manual test**

Run: `npm run dev`
Navigate to a session — sidebar and conversation should stream in independently.

- [ ] **Step 4: Verify event delegation still works**

Test these interactions:
- Copy resume command button
- Quick action buttons (Resume, VS Code, Summary, Export)
- Sidebar resize drag handle
- Dock resize drag handle
- Search form submission

All should work since they use document-level event delegation.

- [ ] **Step 5: Commit**

```bash
git add "src/app/sessions/[id]/page.tsx"
git commit -m "feat: rewrite session detail page with three independent Suspense streaming zones"
```

---

### Task 11: Add Suspense to simple pages (stats, files, tools, config)

**Files:**
- Modify: `src/app/stats/page.tsx`
- Modify: `src/app/files/page.tsx`
- Modify: `src/app/tools/page.tsx`
- Modify: `src/app/config/page.tsx`

- [ ] **Step 1: Wrap each page's content in Suspense**

For each simple page, extract the data-fetching + rendering into an async inner component and wrap it in Suspense. The pattern for each is:

```tsx
import { Suspense } from "react";
import TerminalLoader from "@/src/components/terminal-loader";

// Move existing page content into this component
async function PageContent() {
  // existing data fetching + JSX
}

export default function Page() {
  return (
    <Suspense fallback={<TerminalLoader message="..." />}>
      <PageContent />
    </Suspense>
  );
}
```

Apply this pattern to each page. For `config/page.tsx`, also apply the `Promise.all` parallelization from Task 5.

**Implementer:** Read each page file, extract the async content into an inner component, wrap in Suspense. The outer function becomes synchronous (not async).

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Commit**

```bash
git add src/app/stats/page.tsx src/app/files/page.tsx src/app/tools/page.tsx src/app/config/page.tsx
git commit -m "feat: wrap simple pages in Suspense boundaries for streaming"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Full manual test**

Run: `npm run dev`

Test each navigation path:
1. Click each nav tab — loading state should appear instantly, content streams in
2. Click a session row — IDE layout placeholder appears, sidebar resolves first, then conversation
3. Click back to sessions — sidebar and list stream independently
4. Navigate between two different sessions — ALL three zones should show loading state (key={id} on each)
5. Verify progress bar animates at top during all navigations
6. Verify no hydration errors in browser console
7. Verify all event delegation works (copy buttons, sidebar resize, IDE resize, search, bookmarks)
8. Check for layout shift — sidebar placeholder should be exactly 300px wide (home) / 280px (IDE)
9. Verify sidebar drag handle works on both home page and session detail page
10. Verify error boundaries work — try navigating to `/sessions/nonexistent-id` (should show error page)
11. If `loading.tsx` does NOT show instantly with `force-dynamic`, investigate `unstable_instant` or manual Suspense as fallback

- [ ] **Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: finalize approach C streaming Suspense implementation"
```
