import fs from "fs/promises";
import path from "path";
import { parseJSONLContent } from "./jsonl-parser";
import { getAllSessions, PROJECTS_DIR } from "./claude-data";
import { getAllSessionMetadata } from "./session-metadata";
import { TTLCache } from "./cache";
import type { RawJSONLEntry, RawContentBlock, SearchResult } from "./types";

const MAX_CONTENT_PER_MESSAGE = 2000;
const MAX_SESSIONS_TO_SCAN = 500;
const MAX_RESULTS = 50;

const searchCache = new TTLCache<SearchResult[]>(30_000);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function extractSnippet(
  content: string,
  queryTerms: string[],
  contextChars = 200
): string {
  const lowerContent = content.toLowerCase();
  let matchIdx = -1;

  for (const term of queryTerms) {
    const idx = lowerContent.indexOf(term.toLowerCase());
    if (idx !== -1 && (matchIdx === -1 || idx < matchIdx)) {
      matchIdx = idx;
    }
  }

  if (matchIdx === -1) return "";

  const half = Math.floor(contextChars / 2);
  const start = Math.max(0, matchIdx - half);
  const end = Math.min(content.length, matchIdx + half);
  let snippet = content.slice(start, end);

  // Escape HTML first
  snippet = escapeHtml(snippet);

  // Wrap matched terms in <mark> tags (case-insensitive)
  for (const term of queryTerms) {
    const escaped = escapeHtml(term);
    const regex = new RegExp(
      escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi"
    );
    snippet = snippet.replace(regex, (match) => `<mark>${match}</mark>`);
  }

  // Add ellipsis
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}

interface ContentSegment {
  text: string;
  matchType: "user" | "assistant" | "tool_input" | "tool_result";
}

function extractContentSegments(rawEntries: RawJSONLEntry[]): ContentSegment[] {
  const segments: ContentSegment[] = [];

  for (const raw of rawEntries) {
    if (!raw.message) continue;
    const content = raw.message.content;

    if (raw.type === "user") {
      if (typeof content === "string") {
        segments.push({
          text: content.slice(0, MAX_CONTENT_PER_MESSAGE),
          matchType: "user",
        });
      } else if (Array.isArray(content)) {
        for (const block of content as RawContentBlock[]) {
          if (block.type === "tool_result" && typeof block.content === "string") {
            segments.push({
              text: block.content.slice(0, MAX_CONTENT_PER_MESSAGE),
              matchType: "tool_result",
            });
          }
        }
      }
    } else if (raw.type === "assistant") {
      if (typeof content === "string") {
        segments.push({
          text: content.slice(0, MAX_CONTENT_PER_MESSAGE),
          matchType: "assistant",
        });
      } else if (Array.isArray(content)) {
        const textParts: string[] = [];
        for (const block of content as RawContentBlock[]) {
          if (block.type === "text" && block.text) {
            textParts.push(block.text);
          }
          if (block.type === "tool_use" && block.input) {
            const inputStr = JSON.stringify(block.input).slice(0, MAX_CONTENT_PER_MESSAGE);
            segments.push({ text: inputStr, matchType: "tool_input" });
          }
        }
        if (textParts.length > 0) {
          segments.push({
            text: textParts.join("\n").slice(0, MAX_CONTENT_PER_MESSAGE),
            matchType: "assistant",
          });
        }
      }
    }
  }

  return segments;
}

function scoreMatch(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    let idx = 0;
    while ((idx = lower.indexOf(term, idx)) !== -1) {
      score++;
      idx += term.length;
    }
  }
  return score;
}

async function findSessionFile(sessionId: string): Promise<string | null> {
  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);
    for (const dir of projectDirs) {
      const filePath = path.join(PROJECTS_DIR, dir, `${sessionId}.jsonl`);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // Not in this dir
      }
    }
  } catch {
    // PROJECTS_DIR may not exist
  }
  return null;
}

export async function searchSessions(
  query: string,
  options?: {
    repo?: string;
    branch?: string;
    bookmarked?: boolean;
    tag?: string;
  }
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed}|${options?.repo || ""}|${options?.branch || ""}|${options?.bookmarked || ""}|${options?.tag || ""}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  let sessions = await getAllSessions();
  const allMetadata = options?.bookmarked || options?.tag
    ? await getAllSessionMetadata()
    : {};

  // Pre-filter
  if (options?.repo) {
    sessions = sessions.filter((s) => s.projectPath === options.repo);
  }
  if (options?.branch) {
    sessions = sessions.filter((s) => s.branch === options.branch);
  }
  if (options?.bookmarked) {
    sessions = sessions.filter((s) => allMetadata[s.id]?.bookmarked === true);
  }
  if (options?.tag) {
    sessions = sessions.filter((s) => allMetadata[s.id]?.tags?.includes(options.tag!));
  }

  // Limit scan
  sessions = sessions.slice(0, MAX_SESSIONS_TO_SCAN);

  const results: SearchResult[] = [];

  for (const session of sessions) {
    const filePath = await findSessionFile(session.id);
    if (!filePath) continue;

    try {
      const content = await fs.readFile(filePath, "utf-8");

      // Quick pre-check: does the whole file contain any term?
      const lowerContent = content.toLowerCase();
      const hasAnyTerm = terms.some((t) => lowerContent.includes(t));
      if (!hasAnyTerm) continue;

      const rawEntries = parseJSONLContent(content);
      const segments = extractContentSegments(rawEntries);

      for (const segment of segments) {
        const lowerText = segment.text.toLowerCase();
        // AND logic: all terms must be present
        const allPresent = terms.every((t) => lowerText.includes(t));
        if (!allPresent) continue;

        const score = scoreMatch(segment.text, terms);
        const snippet = extractSnippet(segment.text, terms);

        if (snippet) {
          results.push({
            sessionId: session.id,
            project: session.project,
            projectPath: session.projectPath,
            branch: session.branch,
            lastActiveAt: session.lastActiveAt.toISOString(),
            snippet,
            matchType: segment.matchType,
            score,
          });
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Sort by score descending, take top results
  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, MAX_RESULTS);
  searchCache.set(cacheKey, topResults);
  return topResults;
}
