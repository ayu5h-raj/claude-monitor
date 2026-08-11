# Conversation Tool Visibility

**Date:** 2026-08-11
**Status:** Implemented

Revised after two independent subagent reviews. Their corrections are folded in
below; see Review corrections at the end for what the first draft got wrong.

## Problem

The session conversation view renders skill invocations, MCP/plugin calls, and
subagent spawns as generic amber `TOOL` rows — visually identical to `Bash`,
`Read`, and `Edit`. Identifying *which* skill ran or *which* MCP server was
called requires expanding a collapsed raw-JSON block.

The data is not missing. `mapRawEntriesToSessionEntries` already emits these as
`type: "tool_use"` entries carrying `toolName` and `toolInput`, and
`conversation-entry.tsx` already renders them. They are simply
indistinguishable from routine tool noise.

Within the scope the app actually reads — `lib/claude-data.ts:85` uses a
non-recursive `readdir` per project dir, so nested session files are invisible —
local history contains 25 `Skill` calls, 285 `Agent` calls, and 689 MCP calls
across 52 distinct tools, all currently flattened.

A second, related need: an option to hide tool calls entirely and read the
conversation as plain user/assistant dialogue.

## Goals

1. Skill, MCP, and subagent calls are visually distinct in the conversation
   stream, with their identifying detail readable without expanding anything.
2. A view toggle can reduce the conversation to user/assistant text only.

## Non-goals

- No change to what is parsed or stored. The classification is derived at
  render time from data already present.
- No per-session roll-up of skills/servers used. The Analytics tab already has
  an "Agents & Skills" card; extending it is out of scope here.
- No third "notable only" view mode (hide routine tools, keep skills/MCP/
  agents). Considered and deliberately deferred — see Rejected alternatives.

## Design

### Helpers in `lib/path-utils.ts`

No new module. `path-utils.ts` is already the small-display-helper bucket —
three of its four existing exports have nothing to do with paths — and it is
already imported by both renderers. It is also client-safe, which matters:
`live-session.tsx` is a `"use client"` component, so importing from
`session-analytics.ts` on that path would pull the cost tables into the client
bundle.

`parseMcpName` in `session-analytics.ts:85` is **not** moved or exported. The
reuse would be a three-line `split("__")` — the same size as the import
statement replacing it — so `session-analytics.ts` is untouched.

**`classifyToolCall(toolName, toolInput)`** → `{ kind, label, detail }`:

| Tool name          | kind    | label                                 | detail             |
| ------------------ | ------- | ------------------------------------- | ------------------ |
| `mcp__posthog__exec` | `mcp`   | `posthog`                             | `exec`             |
| `Skill`            | `skill` | `input.skill`                         | `input.args`       |
| `Agent`            | `agent` | `input.subagent_type` ?? `general-purpose` | `input.description` |
| anything else      | `tool`  | the tool name                         | —                  |

**`isChatEntry(entry)`** — true for `user` and `assistant` entries. No
empty-content guard: `jsonl-parser.ts:107` only pushes an assistant entry when
`textParts.length > 0`, so empty entries cannot occur.

### Inline classification

**Two** renderers need this, not one. `conversation-entry.tsx` handles completed
sessions; `live-session.tsx` has its own separate `tool_use` branch and renders
**active** sessions. Changing only the first would leave the feature silently
absent on exactly the sessions being watched live.

Badge text is `kind.toUpperCase()`. Colours mirror `colorForTool()` in
`session-analytics.tsx:34-40` so the conversation stream and the Analytics tab
agree:

| kind    | badge   | colour                                    |
| ------- | ------- | ----------------------------------------- |
| `skill` | `SKILL` | `var(--purple)`                           |
| `agent` | `AGENT` | `var(--purple)` — Analytics colours Agent purple too |
| `mcp`   | `MCP`   | `var(--cyan)`                             |
| `tool`  | `TOOL`  | `var(--amber)` — unchanged                |

Because `SKILL` and `ASSISTANT` are both purple, the row's `border-left` is also
set to the kind colour, so a skill row is distinguishable from an assistant
message at a glance rather than by badge colour alone.

`detail` renders beneath the label, ellipsised in CSS (`.conv-entry-detail`)
rather than truncated to a character count in JS — it adapts to the available
width, and `title={detail}` keeps the full string on hover, so nothing is lost.
The existing collapsed "show input" block is retained unchanged.

### Chat-only filter

- `src/app/sessions/[id]/page.tsx` adds `view?: string` to its `searchParams`
  destructure. `view === "chat"` enables the filter.
- `async-conversation.tsx` accepts a `chatOnly` prop and applies `isChatEntry`
  **before** serializing entries, so the filtered payload is smaller as well.
- `LiveSession` also takes `chatOnly` and applies the same predicate to
  SSE-streamed entries. Without this, an active session in chat-only mode would
  start clean and then progressively refill with tool rows as they stream in.
- The tab links carry `view` forward, so toggling tabs does not silently reset
  the filter.
- The toggle is a plain `<a>` beside the tab bar, carrying the current `tab`
  forward (`?tab=conversation&view=chat`). Rendered only on the conversation
  tab, where it is meaningful.
- Default is unfiltered — absent the param, behaviour is exactly as today.

This follows the established convention: the session page already reads `tab`
from `searchParams` and navigates via plain `<a>` tags, and the home page
filters on `repo`/`branch`/`bookmarked`/`tag`/`q` the same way. No client
component, no hydration risk, and the filtered view is shareable and survives
reload.

## Edge cases

All malformed inputs degrade to the current generic `TOOL` row rather than
rendering `undefined`:

- `Skill` call with no `input.skill`
- `Agent` call with no `subagent_type` — 82 of 285 local calls, ~29% — falls
  back to `general-purpose`, the tool's own default
- `mcp__foo` with no third segment — renders the server alone, no tool
- `mcp__` bare prefix, where the server segment is empty too — falls back to a
  generic row
- `toolInput` absent entirely — label-only row
- blank-string fields (`{skill: "   "}`) treated as absent

## Testing

Appended to the existing `__tests__/path-utils.test.ts` rather than a new file:
`classifyToolCall` across all four kinds, each malformed input above, and
`isChatEntry`. Pure functions, no React.

## Files

| File                                    | Change                                  |
| --------------------------------------- | --------------------------------------- |
| `lib/path-utils.ts`                     | `classifyToolCall`, `toolKindColor`, `isChatEntry` |
| `src/components/conversation-entry.tsx` | classify in the `tool_use` branch       |
| `src/components/live-session.tsx`       | same classification + filter streamed entries |
| `src/components/async-conversation.tsx` | accept `chatOnly`, filter before serializing |
| `src/app/sessions/[id]/page.tsx`        | read `view`, render toggle, carry it across tabs |
| `src/app/globals.css`                   | `.conv-entry-detail` ellipsis rule      |
| `__tests__/path-utils.test.ts`          | appended cases                          |

No new files. No changes to `lib/types.ts`, `lib/jsonl-parser.ts`, or
`lib/session-analytics.ts`. No new client components.

## Review corrections

What the first draft got wrong, caught by review before implementation:

1. **False premise.** It claimed the parser leaves empty-content assistant
   entries when a turn is only tool calls. `jsonl-parser.ts:107` guards that
   push with `if (textParts.length > 0)`; 0 of 2955 assistant entries are
   empty. The non-empty check `isChatEntry` was designed around, and its test
   case, were both removed.
2. **Missed renderer.** `live-session.tsx` renders active sessions with its own
   `tool_use` branch. The original Files table omitted it, so both features
   would have no-opped on live sessions, and streamed entries would have
   bypassed the chat filter entirely.
3. **Unreproducible counts.** 39/375/758 matched neither the app-visible nor the
   recursive scope. Corrected to 25/285/689. "64 of 375 lack `subagent_type`"
   was actually 82 — the draft missed the `{description, prompt}` bucket.
4. **Colour inconsistency.** The draft justified purple for skills by
   consistency with the Analytics tab, then assigned agents blue — where
   Analytics colours them purple.
5. **Wrong blast radius.** `lib/search.ts` consumes `RawJSONLEntry`, not
   `SessionEntry`, and `lib/sse-helpers.ts` references neither. The real
   `SessionEntry` consumers omitted from the list are `lib/todos.ts:46` and
   `src/components/async-plan-viewer.tsx:15`.
6. **Over-packaging.** A new module, a cross-module function move, and a
   separate test file for ~15 lines of logic. All three dropped.

## Rejected alternatives

**Store a `kind` field on `SessionEntry`.** The kind is fully derivable from
`toolName`, so persisting it pushes a computed value through the server/client
serialization boundary and creates a second thing to keep in sync, for no gain.

**New `SessionEntry` union members** (`"skill" | "mcp" | "agent"`). Largest
blast radius: every `entry.type ===` switch — `lib/todos.ts:46`,
`src/components/async-plan-viewer.tsx:15`, the SSE route, and the export route —
all for a purely visual change.

**Pure-CSS checkbox toggle** instead of a URL param. Instant and still
JS-free, but introduces a pattern the repo does not use elsewhere, and the
setting would not survive reload or be shareable. Page loads are already the
interaction model here — tab switching works the same way.

**A third "notable only" mode** (hide routine tools, keep skills/MCP/agents).
Directly serves both goals at once, and is one extra filter branch. Deferred by
explicit decision. Consequence accepted: in chat-only mode the newly
distinguished `SKILL`/`MCP`/`AGENT` rows are hidden along with everything else.
If that proves to be the common working mode, add this later.
