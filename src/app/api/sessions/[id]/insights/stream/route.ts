import OpenAI from "openai";
import { getAIConfig, DEFAULT_INSIGHTS_PROMPT } from "@/lib/ai-config";
import { getSessionDetail } from "@/lib/claude-data";
import {
  ActiveGeneration,
  StreamEvent,
  appendChunk,
  errorGeneration,
  finishGeneration,
  getActiveGeneration,
  startGeneration,
} from "@/lib/insights-stream";
import type { Session, CodeImpact } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function buildSessionContext(
  session: Session,
  codeImpact: CodeImpact,
  entries: Array<{ type: string; content: string; toolName?: string }>
): string {
  const parts: string[] = [];

  // Session metadata
  const duration = new Date(session.lastActiveAt).getTime() - new Date(session.startedAt).getTime();
  parts.push(`=== SESSION METADATA ===
Project: ${session.project}
Branch: ${session.branch}
Model: ${session.model}
Duration: ${formatDuration(duration)}
Messages: ${session.messageCount}
Tool calls: ${session.toolCallCount}
Tokens used: ${formatTokens(session.tokenUsage.input + session.tokenUsage.output)} (input: ${formatTokens(session.tokenUsage.input)}, output: ${formatTokens(session.tokenUsage.output)})`);

  // Code impact summary
  if (codeImpact.totalEdits > 0) {
    const fileList = codeImpact.allFiles
      .slice(0, 20)
      .map(f => `  [${f.changeType}] ${f.filePath}`)
      .join("\n");
    parts.push(`=== CODE IMPACT ===
Files created: ${codeImpact.filesCreated}, modified: ${codeImpact.filesModified}, deleted: ${codeImpact.filesDeleted}
Total edits: ${codeImpact.totalEdits}, lines added: ${codeImpact.linesAdded}, removed: ${codeImpact.linesRemoved}
Impact score: ${codeImpact.impactScore}
Files changed:
${fileList}${codeImpact.allFiles.length > 20 ? `\n  ...and ${codeImpact.allFiles.length - 20} more` : ""}`);
  }

  // Conversation
  parts.push("=== CONVERSATION ===");
  for (const entry of entries) {
    if (entry.type === "user") {
      parts.push(`[USER]: ${entry.content}`);
    } else if (entry.type === "assistant") {
      parts.push(`[ASSISTANT]: ${entry.content}`);
    } else if (entry.type === "tool_use") {
      parts.push(`[TOOL CALL: ${entry.toolName || "unknown"}]`);
    }
  }

  const text = parts.join("\n\n");
  // Truncate to ~100k chars to stay within context limits of most models
  if (text.length > 100_000) {
    return text.slice(0, 100_000) + "\n\n[...conversation truncated...]";
  }
  return text;
}

async function runGenerationInBackground(
  gen: ActiveGeneration,
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  sessionContext: string
): Promise<void> {
  try {
    const client = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey || "not-required",
    });

    const completion = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the full Claude Code session data (metadata, code impact, and conversation):\n\n${sessionContext}`,
        },
      ],
    });

    for await (const chunk of completion) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) appendChunk(gen, text);
    }

    finishGeneration(gen);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error from AI provider";
    errorGeneration(gen, message);
  }
}

function streamToClient(gen: ActiveGeneration, abortSignal: AbortSignal): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function send(event: StreamEvent) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      }

      function closeStream() {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      // Replay everything accumulated so far (handles tab-switch reattach)
      if (gen.content) {
        send({ type: "chunk", text: gen.content });
      }

      // If generation is already finished, send terminal event and close
      if (gen.done) {
        if (gen.error) {
          send({ type: "error", message: gen.error });
        } else {
          send({ type: "complete" });
        }
        closeStream();
        return;
      }

      // Subscribe to live events
      const subscriber = (event: StreamEvent) => {
        send(event);
        if (event.type === "complete" || event.type === "error") {
          gen.subscribers.delete(subscriber);
          closeStream();
        }
      };
      gen.subscribers.add(subscriber);

      // Drop the subscription if the client disconnects (tab switch / page unload)
      abortSignal.addEventListener("abort", () => {
        gen.subscribers.delete(subscriber);
        closeStream();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  // If a generation is already running for this session, just attach to it.
  const existing = getActiveGeneration(id);
  if (existing) {
    return streamToClient(existing, request.signal);
  }

  // Otherwise validate config + session, then kick off a new generation.
  const config = await getAIConfig();
  if (!config) {
    return new Response("AI provider not configured", { status: 400 });
  }

  const result = await getSessionDetail(id);
  if (!result) {
    return new Response("Session not found", { status: 404 });
  }

  const hasConversation = result.entries.some(
    (e) => e.type === "user" || e.type === "assistant"
  );
  if (!hasConversation) {
    return new Response("Session has no conversation data", { status: 400 });
  }

  const sessionContext = buildSessionContext(
    result.session,
    result.codeImpact,
    result.entries
  );

  const gen = startGeneration(id, config.model);

  // Fire-and-forget — generation continues even if this request aborts
  void runGenerationInBackground(
    gen,
    config.baseUrl,
    config.apiKey,
    config.model,
    config.systemPrompt || DEFAULT_INSIGHTS_PROMPT,
    sessionContext
  );

  return streamToClient(gen, request.signal);
}
