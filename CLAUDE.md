# Claude Monitor

Terminal-themed Next.js dashboard for monitoring Claude Code sessions. Reads from `~/.claude/` (read-only).

## Commands

```bash
npm run dev           # Start dev server (standard)
npm run dev:terminal  # Start with embedded terminal support (custom server + WebSocket)
npm run build         # Production build
npm test              # Run tests (vitest)
```

## Architecture

- **Server Components everywhere** — home page has zero client JS
- Filtering via URL search params (`?repo=...&branch=...`), not React state
- Expand/collapse uses native `<details>/<summary>`, not useState
- Only exceptions: `nav.tsx`, `live-session.tsx`, and `terminal.tsx` are client components
- Data read from `~/.claude/projects/` JSONL files with 30s TTL cache

## Key patterns

- **AVOID "use client" components** — React hydration is broken in this project (likely a Next.js 16 + Turbopack issue). Client components render but event handlers (onClick, onChange, useState) do NOT attach. Instead:
  - Use native HTML: `<details>/<summary>` for expand/collapse, `<form>` with `action` for search/filter, `<Link>` for navigation
  - Use URL search params for state (`?repo=...&branch=...`) — server filters, no JS needed
  - All inline scripts consolidated in `layout.tsx` via `next/script` with global event delegation
  - Only client components: `nav.tsx` (pathname), `live-session.tsx` (EventSource), `terminal.tsx` (xterm.js)
- **No `toLocaleTimeString`** — causes hydration mismatch (server UTC vs client local TZ). Use ISO string slicing instead.
- **No Date objects across server/client boundary** — serialize to ISO strings, reconstruct on client if needed.
- **Dates as strings in props** — all component props use `string` for dates, never `Date`.

## Structure

- `lib/` — data access, parser, cache, search, code-impact, SSE helpers, types (server-only)
- `src/app/` — pages (server components) + API routes (export, SSE stream)
- `src/components/` — UI components (mostly server, 3 client components)
- `server.ts` — custom Node.js server for WebSocket terminal support
- `__tests__/` — vitest unit tests with fixtures

## Testing

102 unit tests covering cache, path-utils, JSONL parser, file extraction, tool stats, code impact, search, and SSE helpers. Run from project root:

```bash
npm test
```

@AGENTS.md
