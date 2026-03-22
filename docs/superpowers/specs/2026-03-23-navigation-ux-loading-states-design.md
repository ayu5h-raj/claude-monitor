# Navigation UX: Loading States & Performance

**Date:** 2026-03-23
**Status:** Draft

## Problem

Every page in Claude Monitor blocks on all data fetches before rendering anything. There are zero `loading.tsx` files. When clicking a link, the user sees a frozen screen for 1.5-3 seconds (session detail) or 400-700ms (home page) before the next page appears. This makes the app feel broken and unresponsive.

## Goals

1. Instant visual feedback on every navigation (zero perceived freeze)
2. Reduce actual data load times where possible
3. Maintain the terminal aesthetic throughout
4. Work within existing constraints: no client-side hydration, server components only, native HTML patterns

## Constraints

- React hydration is broken (Next.js 16 + Turbopack issue) — no useState/onClick
- Only client components allowed: `nav.tsx`, `live-session.tsx`, `terminal.tsx`
- All interactivity via inline scripts with global event delegation in `layout.tsx`
- `loading.tsx` files are server components — no hydration needed (safe to use)
- Suspense boundaries with async server components are server-only (safe to use)
- All pages use `export const dynamic = "force-dynamic"` — verify `loading.tsx` compatibility with this setting in Next.js 16 docs before implementation

## Implementation: Two Worktrees

Both approaches share a common foundation. Approach B adds data optimizations. Approach C adds everything in B plus Suspense streaming.

---

## Shared Foundation (Both Approaches)

### CSS Progress Bar

A thin green (`#00ff41`) animated bar fixed to the top of the viewport. Lives inside each `loading.tsx` file so it only appears during route transitions (Next.js mounts `loading.tsx` instantly on navigation start, unmounts when the page renders).

- Pure CSS `@keyframes` animation, no JS
- 3px height, full viewport width
- Animates left-to-right repeatedly until page loads
- Placed as the first child in each `loading.tsx`

### Loading States per Route

| Route | Style | Layout Matching |
|-------|-------|-----------------|
| `/` (home) | Sidebar placeholder + session row skeleton lines | Yes — two-column with sidebar |
| `/sessions/[id]` | Three-panel IDE placeholder (sidebar + center + dock) | Yes — IDE layout |
| `/stats` | Centered terminal loading block | No — simple |
| `/files` | Centered terminal loading block | No — simple |
| `/tools` | Centered terminal loading block | No — simple |
| `/config` | Centered terminal loading block | No — simple |

### Terminal Loading Aesthetic

All loading states use the terminal theme:
- Font: monospace, color `#00ff41` on `#0a0a0a`
- Text like `> loading sessions...` with blinking cursor `_`
- ASCII progress bars: `████████░░░░░░░░`
- Subtle CSS pulse animation on placeholder blocks
- No grey skeleton blocks (breaks terminal aesthetic)

### Shared Components

- `src/components/terminal-loader.tsx` — reusable server component for the centered terminal loading block (used by stats, files, tools, config loading states)
- Avoids duplicating the terminal aesthetic across 4 identical `loading.tsx` files

### Files Created

- `src/components/terminal-loader.tsx` — shared centered loading component
- `src/app/loading.tsx` — home page loading state (layout-matching)
- `src/app/sessions/[id]/loading.tsx` — session detail loading state (IDE layout)
- `src/app/stats/loading.tsx` — simple (imports TerminalLoader)
- `src/app/files/loading.tsx` — simple (imports TerminalLoader)
- `src/app/tools/loading.tsx` — simple (imports TerminalLoader)
- `src/app/config/loading.tsx` — simple (imports TerminalLoader)

### Error Boundaries

Add `error.tsx` files for graceful error handling. Currently, a failed data fetch crashes the entire page with no recovery.

- `src/app/error.tsx` — global fallback, terminal-styled error message with retry link
- `src/app/sessions/[id]/error.tsx` — session-specific error (e.g., corrupt JSONL, missing file) with back-to-home link

These are client components (Next.js requirement for error boundaries) but only need minimal interactivity (a retry button via `reset()` prop). This is one of the few cases where a client component is justified.

### Same-Route Navigation (Dynamic Segments)

Navigating between session detail pages (`/sessions/abc` → `/sessions/def`) may not remount `loading.tsx` because the route structure hasn't changed. Mitigation: in Approach C, the Suspense boundary in the session detail page will use a `key` prop derived from the session ID to force remount. In Approach B, this is less critical since `loading.tsx` at least shows on the initial navigation into the route.

---

## Approach B: Loading States + Data Layer Optimization

### B1. Parallelize Session Detail Fetches

**File:** `src/app/sessions/[id]/page.tsx`

**Current code (lines 27-34):**
```typescript
const result = await getSessionDetail(id);           // 800-1500ms (blocks)
if (!result) notFound();
const { session, entries, codeImpact } = result;
const metadata = await getSessionMetadata(session.id); // 50ms (blocks, sequential)
const [globalConfig, projectConfig] = await Promise.all([
  getGlobalConfig(),                                    // 500-1200ms ─┐ parallel
  getProjectConfig(session.projectPath),                // 100-200ms  ─┘
]);
```
Total: ~getSessionDetail + getSessionMetadata + max(getGlobalConfig, getProjectConfig) = ~1.5-2.9s on cache miss

**Optimized (two-stage parallel):**
```typescript
// Stage 1: run getSessionDetail alongside getGlobalConfig (saves ~500-1200ms)
const [result, globalConfig] = await Promise.all([
  getSessionDetail(id),       // 800-1500ms ─┐
  getGlobalConfig()           // 500-1200ms  ─┘ parallel
]);
if (!result) notFound();
const { session, entries, codeImpact } = result;

// Stage 2: these depend on session data
const [metadata, projectConfig] = await Promise.all([
  getSessionMetadata(session.id),          // 50ms  ─┐
  getProjectConfig(session.projectPath),   // 100-200ms ─┘ parallel
]);
```
Total: ~max(getSessionDetail, getGlobalConfig) + max(getSessionMetadata, getProjectConfig) = ~max(1500, 1200) + 200 = ~1.0-1.7s

**Savings:** ~500-1200ms by running `getGlobalConfig()` in parallel with `getSessionDetail()` instead of after it.

### B2. Parallelize Config Page Fetches

**File:** `src/app/config/page.tsx`

**Current (sequential, lines 81-82):**
```typescript
const config = await getGlobalConfig();     // 500-1200ms
const repoConfigs = await getRepoConfigs(); // 200-500ms
```

**Optimized (parallel):**
```typescript
const [config, repoConfigs] = await Promise.all([
  getGlobalConfig(),
  getRepoConfigs(),
]);
```

### B3. Extend Session Detail Cache TTL

**File:** `lib/claude-data.ts`

Increase `sessionDetailCache` TTL from 300s (5 min) to 600s (10 min). Rationale: completed session JSONL files don't change. Active sessions already use mtime-based invalidation.

### B4. Pre-warm Session List Cache

**File:** `server.ts` (custom server)

Call `getAllSessions()` fire-and-forget on server startup. This warms the 30s TTL cache so the very first navigation hits a warm cache.

```typescript
// At server startup, after listen()
import { getAllSessions } from '../lib/claude-data'
getAllSessions().catch(() => {}) // fire and forget
```

**Caveat:** This only applies when using `npm run dev:terminal` (custom server). The standard `npm run dev` uses Next.js's built-in dev server. Also, with a 30s TTL, the warm cache only helps if the first user visit happens within 30s of startup.

### Expected Performance (Approach B)

| Page | Before | After |
|------|--------|-------|
| Home (cold) | 400-700ms freeze | Instant loading state, ~400-700ms to content (warm: instant) |
| Session detail (cold) | 1.5-2.9s freeze | Instant loading state, ~1.0-1.7s to content |
| Config (cold) | 500-1200ms freeze | Instant loading state, ~500-1200ms to content (parallel) |
| Stats/Files/Tools | 300-700ms freeze | Instant loading state, same actual time |

---

## Approach C: Full Streaming Architecture

Everything in Approach B, plus Suspense boundaries for progressive rendering.

### C1. Home Page Suspense Zones

**File:** `src/app/page.tsx`

Split into two independent async server components:

```tsx
<main>
  <Suspense fallback={<SidebarPlaceholder />}>
    <AsyncSidebar filters={searchParams} />
  </Suspense>

  <Suspense fallback={<SessionListPlaceholder />}>
    <AsyncSessionList filters={searchParams} />
  </Suspense>
</main>
```

- `AsyncSidebar` — calls `getProjects()` + `getAllSessionMetadata()` internally
- `AsyncSessionList` — calls `getAllSessions()` internally, renders session rows
- Each resolves and streams independently

**Data coupling note:** Both `AsyncSidebar` and `AsyncSessionList` depend on `getAllSessions()`. This is safe because the 30s TTL cache (`sessionListCache`) deduplicates — the second call returns cached data. However, cross-cutting concerns exist:
- The sidebar's `selectedRepo` highlight depends on URL params (passed as props, no issue)
- The sidebar's `bookmarkCount` and `tagCounts` come from `getAllSessionMetadata()` (independent of session list)
- The session list's filtering uses URL params (passed as props)
- Both zones derive their own data from the shared cache — no data needs to flow between them

### C2. Session Detail Suspense Zones

**File:** `src/app/sessions/[id]/page.tsx`

Three independent zones matching the IDE layout:

```tsx
<div style={ideMainStyles}>
  <Suspense fallback={<IdeSidebarPlaceholder />}>
    <AsyncIdeSidebar sessionId={id} />
  </Suspense>

  <Suspense fallback={<ConversationPlaceholder />} key={id}>
    <AsyncConversation sessionId={id} />
  </Suspense>

  <Suspense fallback={<DockPlaceholder />}>
    <AsyncTerminalDock sessionId={id} />
  </Suspense>
</div>
```

Note: `key={id}` on the conversation Suspense forces remount when navigating between different sessions, ensuring the loading state re-triggers.

- `AsyncIdeSidebar` — fetches metadata + config, renders stats/actions/tags/files
- `AsyncConversation` — fetches full session detail, renders conversation entries (heaviest)
- `AsyncTerminalDock` — renders terminal component (lightweight, resolves fast)

### C3. Layout Shift Prevention

To prevent layout shift when Suspense zones resolve, placeholders must match final dimensions:

- **Home sidebar placeholder:** `min-width: 220px`, matching the sidebar's default width
- **IDE sidebar placeholder:** `min-width: 280px`, `max-width: 280px`, matching IDE sidebar default
- **Conversation placeholder:** `flex: 1`, fills remaining space (same as real conversation area)
- **Dock placeholder:** `height: 200px`, matching the collapsed dock height
- All placeholders use the same CSS grid/flex properties as the real components

### C4. Simple Pages

Stats, Files, Tools, Config get a single Suspense around main content:

```tsx
<Suspense fallback={<TerminalLoader />}>
  <AsyncPageContent />
</Suspense>
```

### C5. Component Extraction

New async server components needed:
- `src/components/async-sidebar.tsx` — sidebar with own data fetching
- `src/components/async-session-list.tsx` — session list with own data fetching
- `src/components/async-ide-sidebar.tsx` — session detail sidebar with own data fetching
- `src/components/async-conversation.tsx` — conversation with own data fetching
- `src/components/async-terminal-dock.tsx` — terminal dock wrapper

Each component fetches its own data. No data is passed across Suspense boundaries except primitive props (session ID, URL search params).

### C6. Event Delegation Compatibility

The inline scripts in `layout.tsx` use `document.addEventListener` with event delegation (`e.target.closest()`). This pattern works with streaming because:
- Listeners are on `document`, not on specific elements
- `closest()` queries work on dynamically added DOM nodes
- No timing dependency on when elements appear

No changes needed to `layout.tsx` scripts.

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Suspense + async server components | Low risk | Standard Next.js pattern, no hydration |
| Event delegation with streamed content | Low risk | Already uses document-level delegation |
| Layout shift between placeholder and content | Medium risk | Match exact dimensions (see C3) |
| Component extraction breaks existing logic | Medium risk | Extract carefully, test each zone |
| `force-dynamic` + `loading.tsx` incompatibility | Low risk | Verify in Next.js 16 docs before implementation |

### Expected Performance (Approach C)

| Page | Before | After |
|------|--------|-------|
| Home | 400-700ms freeze | First panel in ~200ms, full in ~500ms |
| Session detail | 1.5-2.9s freeze | Sidebar in ~200ms, conversation in ~800ms |
| Stats/Files/Tools | 300-700ms freeze | Loading state instant, content streams in |

---

## Testing Strategy

- Run existing 102 unit tests (`npm test`) to verify no regressions
- Verify all 6 `loading.tsx` files render correctly by navigating between pages
- Verify progress bar animation appears on every navigation
- Verify no hydration errors in browser console
- Verify event delegation still works: copy buttons, sidebar resize, IDE resize, search form, bookmark buttons
- Verify same-route navigation (`/sessions/abc` → `/sessions/def`) shows loading state
- For Approach C: verify no visible layout shift when Suspense zones resolve
- Manual comparison of perceived speed between Approach B and C using Chrome DevTools Network throttling

## Success Criteria

The user will compare both worktrees side-by-side and choose which feels better. Key evaluation points:
1. Does clicking any link produce immediate visual feedback? (both approaches should pass)
2. Is the loading-to-content transition smooth or jarring? (C should be smoother)
3. Is the added complexity of Approach C justified by the UX improvement?

## Decision

Both approaches will be implemented in separate git worktrees for side-by-side comparison. User will evaluate which feels better before merging.
