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

- **No `toLocaleTimeString`** — causes hydration mismatch (server UTC vs client local TZ). Use ISO string slicing instead.
- **No Date objects across server/client boundary** — serialize to ISO strings, reconstruct on client if needed.
- **Dates as strings in props** — all component props use `string` for dates, never `Date`.

## Structure

- `lib/` — data access, parser, cache, types (server-only)
- `src/app/` — pages (server components)
- `src/components/` — UI components (mostly server, except resize-handle and nav)
- `__tests__/` — vitest unit tests with fixtures

## Testing

30 unit tests covering cache, path-utils, and JSONL parser. Run from project root:

```bash
npm test
```

@AGENTS.md
