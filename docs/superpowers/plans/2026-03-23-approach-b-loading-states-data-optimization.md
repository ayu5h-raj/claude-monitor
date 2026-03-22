# Approach B: Loading States + Data Layer Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate perceived navigation lag by adding terminal-themed `loading.tsx` files to all routes, plus optimize data fetching to reduce actual load times.

**Architecture:** Each route gets a `loading.tsx` server component that Next.js wraps in a `<Suspense>` boundary. These show instantly on navigation. Data fetching is parallelized where sequential, and caches are extended. A shared `TerminalLoader` component avoids duplication across 4 simple loading states.

**Tech Stack:** Next.js 16 App Router, React Server Components, CSS animations, TypeScript

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

### Modified Files
| File | Change |
|------|--------|
| `src/app/sessions/[id]/page.tsx:27-34` | Parallelize data fetches (two-stage Promise.all) |
| `src/app/config/page.tsx:81-82` | Parallelize getGlobalConfig + getRepoConfigs |
| `lib/claude-data.ts:29-32` | Increase sessionDetailCache TTL from 300s to 600s |
| `server.ts:148-150` | Add cache pre-warm call after server listen() |

---

### Task 1: Create shared TerminalLoader component

**Files:**
- Create: `src/components/terminal-loader.tsx`

- [ ] **Step 1: Create the TerminalLoader server component**

This is the shared loading UI used by stats, files, tools, and config loading states. It includes the progress bar and a centered terminal-style loading message.

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
      <style>{`@keyframes loadingBar { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
      <div style={progressBarStyle} />
    </>
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
Expected: No build errors related to terminal-loader.tsx

- [ ] **Step 3: Commit**

```bash
git add src/components/terminal-loader.tsx
git commit -m "feat: add shared TerminalLoader component for loading states"
```

---

### Task 2: Create simple loading states (stats, files, tools, config)

**Files:**
- Create: `src/app/stats/loading.tsx`
- Create: `src/app/files/loading.tsx`
- Create: `src/app/tools/loading.tsx`
- Create: `src/app/config/loading.tsx`

- [ ] **Step 1: Create all four simple loading files**

Each imports TerminalLoader with a route-specific message.

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

### Task 3: Create home page loading state (layout-matching)

**Files:**
- Create: `src/app/loading.tsx`

- [ ] **Step 1: Create layout-matching home loading state**

This must match the two-column layout: sidebar on the left (300px, matching `sidebar.tsx` line 39), drag handle (5px), session list on the right. Height must be `calc(100vh - 45px)` matching `session-list.tsx` line 80.

```tsx
// src/app/loading.tsx
import { ProgressBar } from "@/src/components/terminal-loader";

const wrapperStyle = {
  display: "flex",
  height: "calc(100vh - 45px)",
  overflow: "hidden",
};

const sidebarStyle = {
  width: "300px",
  minWidth: "300px",
  borderRight: "1px solid #222222",
  padding: "12px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
};

const sidebarLabelStyle = {
  fontSize: "10px",
  color: "#555555",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
};

const sidebarItemStyle = {
  fontSize: "12px",
  color: "#333333",
  padding: "4px 0",
  borderBottom: "1px solid #1a1a1a",
  animation: "pulse 2s ease-in-out infinite",
};

const contentStyle = {
  flex: 1,
  padding: "12px 16px",
};

const rowStyle = {
  padding: "10px 0",
  borderBottom: "1px solid #1a1a1a",
  display: "flex",
  gap: "16px",
  alignItems: "center",
};

const dotStyle = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "#222222",
};

const barStyle = (width: string) => ({
  height: "10px",
  borderRadius: "2px",
  background: "#151515",
  width,
  animation: "pulse 2s ease-in-out infinite",
});

export default function Loading() {
  return (
    <>
      <ProgressBar />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      <div style={wrapperStyle}>
        {/* Sidebar placeholder */}
        <div style={sidebarStyle}>
          <div style={sidebarLabelStyle}>repos</div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={sidebarItemStyle}>
              <div style={barStyle(i % 2 === 0 ? "80%" : "60%")} />
            </div>
          ))}
          <div style={{ marginTop: "auto" }}>
            <div style={sidebarLabelStyle}>today</div>
            <div style={{ fontSize: "11px", color: "#333333" }}>
              <div style={barStyle("50%")} />
            </div>
          </div>
        </div>

        {/* Drag handle (matches session-list.tsx line 96-104) */}
        <div style={{ width: "5px", background: "var(--border)", flexShrink: 0 }} />

        {/* Session list placeholder */}
        <div style={contentStyle}>
          <div style={{ color: "#00ff41", fontSize: "12px", marginBottom: "12px", fontFamily: "monospace" }}>
            &gt; loading sessions...
            <span style={{ animation: "blink 1s step-end infinite" }}>_</span>
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} style={rowStyle}>
              <div style={dotStyle} />
              <div style={barStyle("120px")} />
              <div style={barStyle("80px")} />
              <div style={barStyle("60px")} />
              <div style={{ marginLeft: "auto", ...barStyle("40px") }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Start dev server and test navigation**

Run: `npm run dev`
Navigate between tabs — the home loading state should appear instantly when clicking "Sessions" from another tab.

- [ ] **Step 4: Commit**

```bash
git add src/app/loading.tsx
git commit -m "feat: add layout-matching loading state for home page"
```

---

### Task 4: Create session detail loading state (IDE layout-matching)

**Files:**
- Create: `src/app/sessions/[id]/loading.tsx`

- [ ] **Step 1: Create IDE layout-matching loading state**

Must match the three-panel layout: header bar, sidebar (280px), center conversation area, bottom dock.

```tsx
// src/app/sessions/[id]/loading.tsx
import { ProgressBar } from "@/src/components/terminal-loader";

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
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>

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
        {/* Sidebar placeholder */}
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

        {/* Sidebar drag handle */}
        <div id="ide-sidebar-drag" className="ide-sidebar-drag">{" "}</div>

        {/* Center conversation placeholder */}
        <div className="ide-center" style={{ padding: "16px" }}>
          <div style={{ color: "#00ff41", fontSize: "12px", marginBottom: "16px", fontFamily: "monospace" }}>
            &gt; loading conversation...
            <span style={{ animation: "blink 1s step-end infinite" }}>_</span>
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
      </div>

      {/* Bottom dock placeholder */}
      <details className="ide-dock">
        <summary>
          <span className="ide-dock-label">TERMINAL</span>
          <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--text-muted)" }} />
          <span className="ide-dock-hint" style={{ color: "var(--text-muted)" }}>loading...</span>
        </summary>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No build errors

- [ ] **Step 3: Test navigation**

Run: `npm run dev`
Click a session row from the home page — the IDE layout loading state should appear instantly.

- [ ] **Step 4: Commit**

```bash
git add "src/app/sessions/[id]/loading.tsx"
git commit -m "feat: add IDE layout-matching loading state for session detail page"
```

---

### Task 5: Create error boundaries

**Files:**
- Create: `src/app/error.tsx`
- Create: `src/app/sessions/[id]/error.tsx`

- [ ] **Step 1: Create global error boundary**

Per Next.js 16 docs, `error.tsx` must be a client component. Uses `unstable_retry` (not `reset`).

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

### Task 6: Parallelize session detail page data fetches

**Files:**
- Modify: `src/app/sessions/[id]/page.tsx:27-34`

- [ ] **Step 1: Run existing tests to establish baseline**

Run: `npm test`
Expected: All 102 tests pass

- [ ] **Step 2: Modify the data fetching in session detail page**

In `src/app/sessions/[id]/page.tsx`, replace lines 27-34:

**Current:**
```typescript
  const result = await getSessionDetail(id);
  if (!result) notFound();
  const { session, entries, codeImpact } = result;
  const metadata = await getSessionMetadata(session.id);
  const [globalConfig, projectConfig] = await Promise.all([
    getGlobalConfig(),
    getProjectConfig(session.projectPath),
  ]);
```

**Replace with:**
```typescript
  // Stage 1: run getSessionDetail alongside getGlobalConfig in parallel
  const [result, globalConfig] = await Promise.all([
    getSessionDetail(id),
    getGlobalConfig(),
  ]);
  if (!result) notFound();
  const { session, entries, codeImpact } = result;

  // Stage 2: these depend on session data
  const [metadata, projectConfig] = await Promise.all([
    getSessionMetadata(session.id),
    getProjectConfig(session.projectPath),
  ]);
```

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: All tests pass (no functional change, just parallelization)

- [ ] **Step 4: Test manually**

Run: `npm run dev`
Navigate to a session detail page — should load noticeably faster on cold cache.

- [ ] **Step 5: Commit**

```bash
git add "src/app/sessions/[id]/page.tsx"
git commit -m "perf: parallelize session detail data fetches (saves ~500-1200ms)"
```

---

### Task 7: Parallelize config page data fetches

**Files:**
- Modify: `src/app/config/page.tsx:81-82`

- [ ] **Step 1: Modify config page data fetching**

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

- [ ] **Step 2: Verify tests still pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/app/config/page.tsx
git commit -m "perf: parallelize config page data fetches"
```

---

### Task 8: Extend session detail cache TTL

**Files:**
- Modify: `lib/claude-data.ts:29-32`

- [ ] **Step 1: Increase cache TTL**

In `lib/claude-data.ts`, change line 29-32:

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

- [ ] **Step 2: Verify tests still pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add lib/claude-data.ts
git commit -m "perf: extend session detail cache TTL from 5min to 10min"
```

---

### Task 9: Add cache pre-warm on server startup

**Files:**
- Modify: `server.ts:148-150`

- [ ] **Step 1: Add cache pre-warm**

In `server.ts`, after the `server.listen` call (line 148), add a fire-and-forget cache warm call. First, add the import at the top of `server.ts` (after line 8):

```typescript
import { getAllSessions } from "./lib/claude-data";
```

Then modify the `server.listen` callback (around line 148):

**Current:**
```typescript
  server.listen(port, () => {
    console.log(`> claude-monitor ready on http://${hostname}:${port}`);
  });
```

**Replace with:**
```typescript
  server.listen(port, () => {
    console.log(`> claude-monitor ready on http://${hostname}:${port}`);
    // Pre-warm session list cache for faster first navigation
    getAllSessions().catch(() => {});
  });
```

- [ ] **Step 2: Test with terminal server**

Run: `npm run dev:terminal`
Expected: Server starts without errors, first page load uses warm cache.

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "perf: pre-warm session list cache on server startup"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All 102+ tests pass

- [ ] **Step 2: Full manual test**

Run: `npm run dev`

Test each navigation path:
1. Click each nav tab (Sessions, Stats, Files, Tools, Config) — loading state should appear instantly
2. Click a session row — IDE loading state should appear instantly
3. Click back to sessions — home loading state should appear
4. Navigate from one session to another (session-to-session) — note: `loading.tsx` may not re-trigger (known limitation, acceptable for Approach B)
5. Verify progress bar animates at top
6. Verify no hydration errors in browser console
7. Verify copy buttons, sidebar resize, search form still work
8. If `loading.tsx` does NOT show instantly with `force-dynamic` pages, investigate `unstable_instant` export or add manual Suspense boundaries as fallback

- [ ] **Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: finalize approach B loading states implementation"
```
