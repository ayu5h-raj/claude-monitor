# Conversation Tool Visibility

**Date:** 2026-08-11
**Status:** Approved, not yet implemented

## Problem

The session conversation view renders skill invocations, MCP/plugin calls, and
subagent spawns as generic amber `TOOL` rows — visually identical to `Bash`,
`Read`, and `Edit`. Identifying *which* skill ran or *which* MCP server was
called requires expanding a collapsed raw-JSON block.

The data is not missing. `mapRawEntriesToSessionEntries` already emits these as
`type: "tool_use"` entries carrying `toolName` and `toolInput`, and
`conversation-entry.tsx` already renders them. They are simply
indistinguishable from routine tool noise.

Local session history contains 39 `Skill` calls, 375 `Agent` calls, and 758
MCP calls across 52 distinct tools — all currently flattened.

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

### New module: `lib/tool-display.ts`

A dedicated module rather than an addition to `path-utils.ts`, since none of
this concerns paths.

**`parseMcpName(name)`** — moved here from `lib/session-analytics.ts:85`, where
it is currently private. `session-analytics.ts` imports it back, leaving one
copy.

**`classifyToolCall(toolName, toolInput)`** → `{ kind, label, detail }`:

| Tool name          | kind    | label                                 | detail             |
| ------------------ | ------- | ------------------------------------- | ------------------ |
| `mcp__posthog__exec` | `mcp`   | `posthog`                             | `exec`             |
| `Skill`            | `skill` | `input.skill`                         | `input.args`       |
| `Agent`            | `agent` | `input.subagent_type` ?? `general-purpose` | `input.description` |
| anything else      | `tool`  | the tool name                         | —                  |

**`isChatEntry(entry)`** — true for `user` and `assistant` entries whose text
content is non-empty.

### Inline classification

The `tool_use` branch of `conversation-entry.tsx` calls `classifyToolCall` and
renders badge text and colour by kind:

| kind    | badge   | colour                                              |
| ------- | ------- | --------------------------------------------------- |
| `skill` | `SKILL` | `var(--purple)` — matches the Analytics tab's existing colour for Skill |
| `mcp`   | `MCP`   | `var(--cyan)`                                       |
| `agent` | `AGENT` | `var(--blue)`                                       |
| `tool`  | `TOOL`  | `var(--amber)` — unchanged                          |

`detail` renders as an inline line beneath the label, truncated at 120
characters. The existing collapsed "show input" block is retained unchanged, so
the full payload is always still reachable.

### Chat-only filter

- `src/app/sessions/[id]/page.tsx` adds `view?: string` to its `searchParams`
  destructure. `view === "chat"` enables the filter.
- `async-conversation.tsx` accepts a `chatOnly` prop and applies `isChatEntry`
  **before** serializing entries, so the filtered payload is smaller as well.
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
- `Agent` call with no `subagent_type` — 64 of 375 local calls — falls back to
  `general-purpose`
- `mcp__foo` with no third segment — renders the server alone, no tool
- `toolInput` absent entirely — label-only row

One filtering edge case: the parser emits assistant text and tool calls as
*separate* entries, so an assistant turn consisting only of tool calls leaves an
entry with empty text content. `isChatEntry` drops these; without that,
chat-only mode would render blank rows.

## Testing

`__tests__/tool-display.test.ts`:

- `classifyToolCall` across all four kinds
- each of the four malformed inputs above
- `isChatEntry` including the empty-content assistant entry

Both are pure functions, testable without React, matching the existing test
pattern in `__tests__/`.

## Files

| File                                  | Change                                |
| ------------------------------------- | ------------------------------------- |
| `lib/tool-display.ts`                 | new — three functions above           |
| `__tests__/tool-display.test.ts`      | new                                   |
| `lib/session-analytics.ts`            | import `parseMcpName`, drop local copy |
| `src/components/conversation-entry.tsx` | classify in the `tool_use` branch    |
| `src/components/async-conversation.tsx` | accept `chatOnly`, filter entries    |
| `src/app/sessions/[id]/page.tsx`      | read `view` param, render toggle      |

No changes to `lib/types.ts` or `lib/jsonl-parser.ts`. No new client
components.

## Rejected alternatives

**Store a `kind` field on `SessionEntry`.** The kind is fully derivable from
`toolName`, so persisting it pushes a computed value through the server/client
serialization boundary and creates a second thing to keep in sync, for no gain.

**New `SessionEntry` union members** (`"skill" | "mcp" | "agent"`). Largest
blast radius: every `entry.type ===` switch, plus the SSE helpers, export route,
and search would need updating — all for a purely visual change.

**Pure-CSS checkbox toggle** instead of a URL param. Instant and still
JS-free, but introduces a pattern the repo does not use elsewhere, and the
setting would not survive reload or be shareable. Page loads are already the
interaction model here — tab switching works the same way.

**A third "notable only" mode** (hide routine tools, keep skills/MCP/agents).
Directly serves both goals at once, and is one extra filter branch. Deferred by
explicit decision. Consequence accepted: in chat-only mode the newly
distinguished `SKILL`/`MCP`/`AGENT` rows are hidden along with everything else.
If that proves to be the common working mode, add this later.
