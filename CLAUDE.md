# Claude Monitor

Terminal-themed Next.js dashboard for monitoring Claude Code sessions. Reads from `~/.claude/` (read-only).

## Commands

```bash
npm run dev           # Web dev server (standard)
npm run dev:terminal  # Web + embedded terminal (custom server + WebSocket)
npm run dev:desktop   # Electron desktop app (dev mode)
npm run build         # Next.js production build
npm run build:desktop # Build macOS .dmg (output in release/)
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
- `electron/` — Electron main process (`main.ts`), preload, and tsconfig
- `electron-builder.yml` — desktop app packaging config
- `__tests__/` — vitest unit tests with fixtures

## Testing

Unit tests covering cache, path-utils, JSONL parser, file extraction, tool stats, code impact, search, and SSE helpers. Run from project root:

```bash
npm test
```

## Releasing a new version

The release pipeline is fully automated. To ship a new version:

1. Bump `version` in `package.json`
2. Commit and merge to `main`
3. Tag and push:
   ```bash
   git tag v<version>
   git push origin v<version>
   ```

CI (`.github/workflows/build-desktop.yml`) will automatically:
- Build macOS `.dmg` files (arm64 + x64) via electron-builder
- Create a GitHub Release with both DMGs attached
- Update the Homebrew cask formula in `ayu5h-raj/homebrew-tap` with the new version and sha256

The `HOMEBREW_TAP_TOKEN` secret (GitHub PAT with repo scope for `homebrew-tap`) must be set in this repo's Actions secrets.

### Electron architecture

- `electron/main.ts` adapts `server.ts` for Electron — starts the HTTP + WebSocket + node-pty server on a dynamic port, then opens a BrowserWindow
- In dev mode (`npm run dev:desktop`), the server runs via `tsx` and Electron just opens a window to `localhost:3000`
- In production, the server runs inside Electron's main process
- `node-pty` is rebuilt for Electron's Node ABI automatically by electron-builder during `build:desktop`
- Do NOT add `output: "standalone"` to `next.config.ts` — it is incompatible with the custom server

@AGENTS.md
