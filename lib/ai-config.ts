import fs from "fs/promises";
import path from "path";
import os from "os";

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
}

export const DEFAULT_INSIGHTS_PROMPT = `You are analyzing a Claude Code session. Provide a structured, insightful summary of the session in markdown format.

Use exactly these sections:

## Goal
What was the user trying to accomplish? State the core objective clearly in 1-2 sentences.

## Approach
How was the task tackled? Describe the overall strategy — not individual tool calls, but the high-level method (e.g., "explored existing patterns first, then extended them" or "built a prototype, iterated based on errors").

## Key Decisions
Major choices made during the session. For each decision:
- What was decided
- What alternatives existed (if apparent)
- Why this path was chosen

Focus on architecture choices, library/pattern selections, approach pivots, and trade-offs. Skip routine decisions like "read a file" or "ran tests."

## Decision Flow
Provide a mermaid flowchart showing the key decision points and how the session progressed. Use this format:

\`\`\`mermaid
flowchart TD
    A[Starting point] --> B{First decision}
    B -->|Choice made| C[Action taken]
    B -->|Alternative| D[Path not taken]
    C --> E{Next decision}
    E --> F[Outcome]
\`\`\`

Keep the diagram focused on 4-8 key nodes. Show decision points as diamonds, actions as rectangles, and the final outcome as a rounded rectangle. Include brief labels on edges to explain why a path was chosen.

## Pivots
Any changes in direction — what triggered them and what changed. If there were no significant pivots, say "No major pivots — the approach was consistent throughout" and move on.

## Outcome
What was achieved by the end of the session? Include:
- What was built, fixed, or changed
- What's left incomplete (if anything)
- Any risks or follow-ups worth noting

Keep it concise and analytical. Focus on the "why" behind decisions, not the "what" of individual actions. Write in a direct tone — no filler, no hedging.`;

const CONFIG_DIR = path.join(os.homedir(), ".claude-monitor");
const CONFIG_FILE = path.join(CONFIG_DIR, "ai-config.json");

export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (data.baseUrl && data.apiKey && data.model) {
      return data as AIConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}
