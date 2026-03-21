import type {
  RawJSONLEntry,
  RawContentBlock,
  SessionEntry,
  Session,
  TokenUsage,
} from "./types";
import { extractRepoName } from "./path-utils";

export function parseJSONLContent(content: string): RawJSONLEntry[] {
  const lines = content.split("\n");
  const entries: RawJSONLEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

export function mapRawEntriesToSessionEntries(
  rawEntries: RawJSONLEntry[]
): SessionEntry[] {
  const entries: SessionEntry[] = [];

  for (const raw of rawEntries) {
    if (
      raw.type === "progress" ||
      raw.type === "file-history-snapshot" ||
      raw.type === "system"
    ) {
      continue;
    }

    if (!raw.message || !raw.timestamp) continue;

    const timestamp = new Date(raw.timestamp);
    const uuid = raw.uuid || "";

    if (raw.type === "user") {
      const content = raw.message.content;

      if (typeof content === "string") {
        entries.push({ type: "user", timestamp, content, uuid });
        continue;
      }

      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_result") {
            entries.push({
              type: "tool_result",
              timestamp,
              content: typeof block.content === "string" ? block.content : "",
              isError: block.is_error || false,
              uuid,
            });
          }
        }
        continue;
      }
    }

    if (raw.type === "assistant") {
      const content = raw.message.content;
      const model = raw.message.model;
      const rawUsage = raw.message.usage;
      const usage: TokenUsage | undefined = rawUsage
        ? {
            input: rawUsage.input_tokens || 0,
            output: rawUsage.output_tokens || 0,
            cacheRead: rawUsage.cache_read_input_tokens || 0,
            cacheCreation: rawUsage.cache_creation_input_tokens || 0,
          }
        : undefined;

      if (typeof content === "string") {
        entries.push({ type: "assistant", timestamp, content, model, usage, uuid });
        continue;
      }

      if (Array.isArray(content)) {
        const textParts: string[] = [];
        for (const block of content) {
          if (block.type === "text" && block.text) {
            textParts.push(block.text);
          }
          if (block.type === "tool_use") {
            entries.push({
              type: "tool_use",
              timestamp,
              content: "",
              toolName: block.name,
              toolInput: block.input,
              model,
              uuid: block.id || uuid,
            });
          }
        }

        if (textParts.length > 0) {
          entries.push({
            type: "assistant",
            timestamp,
            content: textParts.join("\n"),
            model,
            usage,
            uuid,
          });
        }
      }
    }
  }

  return entries;
}

export function extractToolStats(
  rawEntries: RawJSONLEntry[]
): Record<string, { calls: number; errors: number }> {
  const stats: Record<string, { calls: number; errors: number }> = {};

  // Track tool names by their tool_use ID so we can attribute errors
  const toolNameById = new Map<string, string>();

  for (const raw of rawEntries) {
    // Count tool calls from assistant messages
    if (raw.type === "assistant" && raw.message && Array.isArray(raw.message.content)) {
      for (const block of raw.message.content as RawContentBlock[]) {
        if (block.type === "tool_use" && block.name) {
          if (!stats[block.name]) stats[block.name] = { calls: 0, errors: 0 };
          stats[block.name].calls++;
          if (block.id) toolNameById.set(block.id, block.name);
        }
      }
    }

    // Count errors from tool results
    if (raw.type === "user" && raw.message && Array.isArray(raw.message.content)) {
      for (const block of raw.message.content as RawContentBlock[]) {
        if (block.type === "tool_result" && block.is_error && block.tool_use_id) {
          const toolName = toolNameById.get(block.tool_use_id);
          if (toolName && stats[toolName]) {
            stats[toolName].errors++;
          }
        }
      }
    }
  }

  return stats;
}

export function extractFilesChanged(rawEntries: RawJSONLEntry[]): string[] {
  const files = new Set<string>();

  for (const raw of rawEntries) {
    if (raw.type !== "assistant" || !raw.message) continue;
    const content = raw.message.content;
    if (!Array.isArray(content)) continue;

    for (const block of content as RawContentBlock[]) {
      if (
        block.type === "tool_use" &&
        (block.name === "Edit" || block.name === "Write") &&
        block.input &&
        typeof block.input.file_path === "string"
      ) {
        files.add(block.input.file_path);
      }
    }
  }

  return Array.from(files);
}

export function extractSessionMetadata(
  rawEntries: RawJSONLEntry[],
  sessionId: string
): Omit<Session, "status"> {
  let cwd = "";
  let branch = "unknown";
  let model = "unknown";
  const tokenUsage: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  let messageCount = 0;
  let toolCallCount = 0;
  const filesChanged = extractFilesChanged(rawEntries);
  const toolStats = extractToolStats(rawEntries);

  const timestamps: Date[] = [];

  for (const raw of rawEntries) {
    if (raw.cwd && !cwd) cwd = raw.cwd;
    if (raw.gitBranch && raw.gitBranch !== "HEAD" && branch === "unknown") {
      branch = raw.gitBranch;
    }
    if (raw.timestamp) {
      timestamps.push(new Date(raw.timestamp));
    }

    if (raw.type === "user" && raw.message) {
      const content = raw.message.content;
      if (typeof content === "string") {
        messageCount++;
      }
    }

    if (raw.type === "assistant" && raw.message) {
      messageCount++;
      if (raw.message.model) model = raw.message.model;

      const usage = raw.message.usage;
      if (usage) {
        tokenUsage.input += usage.input_tokens || 0;
        tokenUsage.output += usage.output_tokens || 0;
        tokenUsage.cacheRead += usage.cache_read_input_tokens || 0;
        tokenUsage.cacheCreation += usage.cache_creation_input_tokens || 0;
      }

      if (Array.isArray(raw.message.content)) {
        for (const block of raw.message.content as RawContentBlock[]) {
          if (block.type === "tool_use") toolCallCount++;
        }
      }
    }
  }

  if (branch === "unknown") {
    const anyBranch = rawEntries.find((e) => e.gitBranch);
    if (anyBranch?.gitBranch) branch = anyBranch.gitBranch;
  }

  const sortedTimestamps = timestamps.sort((a, b) => a.getTime() - b.getTime());

  return {
    id: sessionId,
    project: extractRepoName(cwd),
    projectPath: cwd,
    branch,
    startedAt: sortedTimestamps[0] || new Date(),
    lastActiveAt: sortedTimestamps[sortedTimestamps.length - 1] || new Date(),
    messageCount,
    toolCallCount,
    tokenUsage,
    model,
    filesChanged,
    toolStats,
  };
}
