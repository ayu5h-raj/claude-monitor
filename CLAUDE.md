# Claude Monitor

Terminal-themed Next.js dashboard for monitoring Claude Code sessions. Reads from `~/.claude/` (read-only).

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm test         # Run tests (vitest)
```

## Architecture

- **Server Components everywhere** — home page has zero client JS
- Filtering via URL search params (`?repo=...&branch=...`), not React state
- Expand/collapse uses native `<details>/<summary>`, not useState
- Only exception: `resize-handle.tsx` and `nav.tsx` are client components
- Data read from `~/.claude/projects/` JSONL files with 30s TTL cache

## Key patterns

- **AVOID "use client" components** — React hydration is broken in this project (likely a Next.js 16 + Turbopack issue). Client components render but event handlers (onClick, onChange, useState) do NOT attach. Instead:
  - Use native HTML: `<details>/<summary>` for expand/collapse, `<form>` with `action` for search/filter, `<Link>` for navigation
  - Use URL search params for state (`?repo=...&branch=...`) — server filters, no JS needed
  - Use `dangerouslySetInnerHTML` with `<script>` for tiny behaviors (e.g., auto-submit on select change)
  - Only exceptions: `resize-handle.tsx` and `nav.tsx` (minimal client components)
- **No `toLocaleTimeString`** — causes hydration mismatch (server UTC vs client local TZ). Use ISO string slicing instead.
- **No Date objects across server/client boundary** — serialize to ISO strings, reconstruct on client if needed.
- **Dates as strings in props** — all component props use `string` for dates, never `Date`.

## Structure

- `lib/` — data access, parser, cache, types (server-only)
- `src/app/` — pages (server components)
- `src/components/` — UI components (mostly server, except resize-handle and nav)
- `__tests__/` — vitest unit tests with fixtures

## Testing

35 unit tests covering cache, path-utils, JSONL parser, file extraction, and tool stats. Run from project root:

```bash
npm test
```

@AGENTS.md
