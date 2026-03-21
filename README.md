# claude-monitor

A terminal-themed web dashboard for monitoring Claude Code sessions across all your local repositories.

![Terminal UI](https://img.shields.io/badge/UI-Terminal_Themed-00ff41?style=flat-square&labelColor=0a0a0a)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)

## What it does

Reads Claude Code session data from `~/.claude/` and gives you:

- **Session list** — all sessions across repos with tokens, tool calls, branch, and relative time
- **Repo sidebar** — filter by repository and branch, with session counts
- **Session replay** — drill into any session to see the full conversation (user messages, assistant responses, tool calls with expandable input/output)
- **Usage stats** — total sessions, token usage by model, activity chart, cost estimates

## Quick start

```bash
cd claude-monitor
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard reads directly from `~/.claude/projects/` — no setup needed if you use Claude Code.

## Architecture

```
~/.claude/ (read-only)
├── projects/<encoded-path>/<sessionId>.jsonl  → session conversations
├── stats-cache.json                           → daily aggregated metrics
└── sessions/<pid>.json                        → active session indicators
         │
         ▼
    Next.js Server Components
    ├── JSONL parser + in-memory cache (30s TTL)
    ├── Repo/worktree detection from cwd field
    └── Server-side filtering via URL search params
         │
         ▼
    Terminal-themed UI (zero client JS on home page)
```

- **Read-only** — never writes to `~/.claude/`, safe alongside active sessions
- **Server Components** — no sensitive file paths leak to the client
- **No database** — reads JSONL files directly with in-memory caching

## Tech stack

- Next.js 16 (App Router, Server Components)
- TypeScript
- Tailwind CSS v4
- Vitest for testing

## Project structure

```
claude-monitor/
├── src/app/
│   ├── page.tsx                # session list (server component, URL-based filtering)
│   ├── sessions/[id]/page.tsx  # session detail / replay
│   └── stats/page.tsx          # usage stats dashboard
├── src/components/
│   ├── sidebar.tsx             # repo tree (native <details>/<summary>)
│   ├── session-list.tsx        # session table layout
│   ├── session-row.tsx         # individual session row
│   ├── conversation-entry.tsx  # message/tool in detail view
│   ├── stat-card.tsx           # stat card
│   ├── activity-chart.tsx      # ASCII activity bar chart
│   └── model-breakdown.tsx     # token usage by model
├── lib/
│   ├── claude-data.ts          # data access layer (reads ~/.claude/)
│   ├── jsonl-parser.ts         # JSONL parser + entry mapping
│   ├── cache.ts                # in-memory TTL cache
│   ├── types.ts                # TypeScript interfaces
│   └── path-utils.ts           # formatting helpers
└── __tests__/                  # 30 unit tests
```

## Running tests

```bash
cd claude-monitor
npm test
```

## License

MIT
