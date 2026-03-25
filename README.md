# claude-monitor

A terminal-themed dashboard for monitoring Claude Code sessions across all your local repositories. Available as a macOS desktop app or web dashboard.

![Terminal UI](https://img.shields.io/badge/UI-Terminal_Themed-00ff41?style=flat-square&labelColor=0a0a0a)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![macOS](https://img.shields.io/badge/macOS-Desktop_App-blue?style=flat-square)

## What it does

Reads Claude Code session data from `~/.claude/` (read-only) and gives you:

- **Session list** — all sessions across repos with tokens, tool calls, branch, and relative time
- **Full-text search** — search across all conversation content with highlighted snippets
- **Session replay** — full conversation with user messages, assistant responses, tool calls
- **Live monitoring** — real-time streaming of active sessions via SSE
- **Code impact view** — structured summary of file changes with expandable diffs and impact scoring
- **Embedded terminal** — resume any session directly from the browser via xterm.js
- **Usage stats** — total sessions, token usage by model, activity heatmap
- **Repo sidebar** — filter by repository, branch, bookmarks, and tags

## Install

### Desktop app (recommended)

```bash
brew tap ayu5h-raj/tap
brew install --cask claude-monitor
```

Or download the `.dmg` from [GitHub Releases](https://github.com/ayu5h-raj/claude-monitor/releases).

### From source

Requires [Node.js](https://nodejs.org/) v20+ and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed.

```bash
git clone https://github.com/ayu5h-raj/claude-monitor.git
cd claude-monitor
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For the embedded terminal (requires `node-pty` — macOS: `xcode-select --install`):

```bash
npm run dev:terminal
```

## Features

### Search across sessions
Type in the search bar to find any conversation content. Supports multi-word AND queries, combined with repo/branch/tag filters.

### Live session monitoring
Active Claude Code sessions show a pulsing green dot. Click into one to see messages appear in real-time via Server-Sent Events.

### Code impact view
Each session shows a structured summary of files created/modified with expandable diffs, line counts, and an impact score.

### Embedded terminal
Click the TERMINAL dock at the bottom of any session to open an interactive terminal that runs `claude --resume` — no need to switch to your terminal app.

### Session metadata
Bookmark sessions, add tags, write notes. All stored locally in `~/.claude-monitor/`.

## Architecture

```
~/.claude/ (read-only)
├── projects/<encoded-path>/<sessionId>.jsonl  -> session conversations
├── stats-cache.json                           -> daily aggregated metrics
└── sessions/<pid>.json                        -> active session indicators
         |
         v
    Next.js Server Components
    ├── JSONL parser + in-memory cache (30s TTL)
    ├── Full-text search with snippet extraction
    ├── SSE streaming for live sessions
    ├── Code impact extraction from tool calls
    └── Server-side filtering via URL search params
         |
         v
    Terminal-themed IDE layout
    ├── Left sidebar: stats, actions, collapsible panels
    ├── Center: conversation replay with card styling
    └── Bottom dock: embedded terminal (xterm.js + WebSocket)
```

- **Read-only** — never writes to `~/.claude/`, safe alongside active sessions
- **Server Components** — no sensitive file paths leak to the client
- **No database** — reads JSONL files directly with in-memory caching
- **Local only** — reads from your machine's `~/.claude/` directory

## Commands

```bash
npm run dev           # Web dev server (standard)
npm run dev:terminal  # Web + embedded terminal (custom server + WebSocket)
npm run dev:desktop   # Electron desktop app (dev mode)
npm run build         # Next.js production build
npm run build:desktop # Build macOS .dmg
npm test              # Run tests
```

## Tech stack

- Next.js 16 (App Router, Server Components)
- Electron + electron-builder (desktop app)
- TypeScript
- Tailwind CSS v4
- xterm.js + node-pty (embedded terminal)
- Vitest for testing

## Project structure

```
claude-monitor/
├── src/app/
│   ├── page.tsx                         # session list with search
│   ├── sessions/[id]/page.tsx           # three-panel session detail
│   ├── stats/page.tsx                   # usage stats & heatmap
│   ├── files/page.tsx                   # file change history
│   ├── tools/page.tsx                   # tool analytics
│   ├── config/page.tsx                  # global & repo config
│   └── api/
│       ├── export/[id]/route.ts         # markdown export
│       └── sessions/[id]/stream/route.ts # SSE live streaming
├── src/components/
│   ├── session-list.tsx                 # session table with search bar
│   ├── session-row.tsx                  # individual session row
│   ├── sidebar.tsx                      # repo tree with toggle controls
│   ├── conversation-entry.tsx           # message/tool card styling
│   ├── code-impact-view.tsx             # file changes with diffs
│   ├── search-results.tsx               # search result cards
│   ├── live-session.tsx                 # real-time SSE streaming (client)
│   └── terminal.tsx                     # xterm.js terminal (client)
├── lib/
│   ├── claude-data.ts                   # data access layer
│   ├── jsonl-parser.ts                  # JSONL parser + extraction
│   ├── search.ts                        # full-text search engine
│   ├── code-impact.ts                   # code change analysis
│   ├── sse-helpers.ts                   # SSE utility functions
│   ├── cache.ts                         # in-memory TTL cache
│   ├── types.ts                         # TypeScript interfaces
│   └── path-utils.ts                    # formatting helpers
├── server.ts                            # custom server for WebSocket terminal
├── electron/
│   ├── main.ts                          # Electron main process
│   ├── preload.ts                       # preload script
│   └── tsconfig.json                    # Electron TypeScript config
├── electron-builder.yml                 # desktop app build config
├── scripts/build-electron.sh            # build orchestration
└── __tests__/                           # unit tests
```

## License

MIT
