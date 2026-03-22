import { getSessionDetail } from "@/lib/claude-data";
import { getSessionMetadata } from "@/lib/session-metadata";
import { formatDuration, formatTokenCount, getModelContextLimit } from "@/lib/path-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getSessionDetail(id);

  if (!detail) {
    return new Response("Session not found", { status: 404 });
  }

  const { session, entries } = detail;
  const metadata = await getSessionMetadata(id);
  const shortId = id.slice(0, 8);
  const totalTokens = session.tokenUsage.input + session.tokenUsage.output;
  const duration =
    session.startedAt && session.lastActiveAt
      ? formatDuration(
          new Date(session.lastActiveAt).getTime() - new Date(session.startedAt).getTime()
        )
      : "unknown";

  let md = `# Session ${shortId}\n\n`;
  md += `**Project:** ${session.project}\n`;
  md += `**Branch:** ${session.branch}\n`;
  const startedIso = typeof session.startedAt === "string" ? session.startedAt : session.startedAt.toISOString();
  md += `**Started:** ${startedIso}\n`;
  md += `**Duration:** ${duration}\n`;
  md += `**Model:** ${session.model}\n`;
  md += `**Tokens:** ${formatTokenCount(totalTokens)} (input: ${formatTokenCount(session.tokenUsage.input)}, output: ${formatTokenCount(session.tokenUsage.output)})\n`;

  if (session.contextSize > 0) {
    const contextLimit = getModelContextLimit(session.model);
    const pct = contextLimit > 0 ? Math.round((session.contextSize / contextLimit) * 100) : 0;
    md += `**Context:** ${formatTokenCount(session.contextSize)} / ${formatTokenCount(contextLimit)} (${pct}%)\n`;
  }

  if (session.filesChanged.length > 0) {
    md += `**Files changed:** ${session.filesChanged.join(", ")}\n`;
  }

  if (metadata?.tags?.length) {
    md += `**Tags:** ${metadata.tags.join(", ")}\n`;
  }

  if (metadata?.notes) {
    md += `\n> ${metadata.notes.replace(/\n/g, "\n> ")}\n`;
  }

  md += `\n---\n\n## Conversation\n\n`;

  for (const entry of entries) {
    const time = (typeof entry.timestamp === "string" ? entry.timestamp : entry.timestamp.toISOString()).slice(11, 19);

    if (entry.type === "user") {
      md += `### User — ${time}\n\n${entry.content}\n\n`;
    } else if (entry.type === "assistant") {
      md += `### Assistant — ${time}\n\n${entry.content}\n\n`;
    } else if (entry.type === "tool_use") {
      md += `#### Tool: ${entry.toolName}\n\n`;
      if (entry.toolInput) {
        const inputStr = typeof entry.toolInput === "string"
          ? entry.toolInput
          : JSON.stringify(entry.toolInput, null, 2);
        const truncated = inputStr.length > 500 ? inputStr.slice(0, 500) + "\n...(truncated)" : inputStr;
        md += "**Input:**\n```json\n" + truncated + "\n```\n\n";
      }
    } else if (entry.type === "tool_result") {
      const status = entry.isError ? "ERROR" : "OK";
      md += `**Result (${status}):**\n`;
      if (entry.content) {
        const truncated =
          entry.content.length > 500
            ? entry.content.slice(0, 500) + "\n...(truncated)"
            : entry.content;
        md += "```\n" + truncated + "\n```\n\n";
      }
    }
  }

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-${shortId}.md"`,
    },
  });
}
