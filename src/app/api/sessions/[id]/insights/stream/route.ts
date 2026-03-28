import OpenAI from "openai";
import { getAIConfig, DEFAULT_INSIGHTS_PROMPT } from "@/lib/ai-config";
import { getSessionDetail } from "@/lib/claude-data";
import { saveCachedInsights } from "@/lib/insights-cache";

export const dynamic = "force-dynamic";

function buildConversationText(
  entries: Array<{ type: string; content: string; toolName?: string }>
): string {
  const parts: string[] = [];
  for (const entry of entries) {
    if (entry.type === "user") {
      parts.push(`[USER]: ${entry.content}`);
    } else if (entry.type === "assistant") {
      parts.push(`[ASSISTANT]: ${entry.content}`);
    } else if (entry.type === "tool_use") {
      parts.push(`[TOOL CALL: ${entry.toolName || "unknown"}]`);
    }
    // Skip tool_result to save tokens — tool calls already indicate what happened
  }

  const text = parts.join("\n\n");
  // Truncate to ~100k chars to stay within context limits of most models
  if (text.length > 100_000) {
    return text.slice(0, 100_000) + "\n\n[...conversation truncated...]";
  }
  return text;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const config = await getAIConfig();
  if (!config) {
    return new Response("AI provider not configured", { status: 400 });
  }

  const result = await getSessionDetail(id);
  if (!result) {
    return new Response("Session not found", { status: 404 });
  }

  const conversationText = buildConversationText(result.entries);
  if (!conversationText.trim()) {
    return new Response("Session has no conversation data", { status: 400 });
  }

  const client = new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  const encoder = new TextEncoder();
  let fullContent = "";
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const completion = await client.chat.completions.create({
          model: config.model,
          stream: true,
          messages: [
            { role: "system", content: config.systemPrompt || DEFAULT_INSIGHTS_PROMPT },
            {
              role: "user",
              content: `Here is the full Claude Code session conversation:\n\n${conversationText}`,
            },
          ],
        });

        for await (const chunk of completion) {
          if (closed) break;
          const text = chunk.choices?.[0]?.delta?.content;
          if (text) {
            fullContent += text;
            send({ type: "chunk", text });
          }
        }

        // Cache the result
        await saveCachedInsights(id, {
          generatedAt: new Date().toISOString(),
          model: config.model,
          content: fullContent,
        });

        send({ type: "complete" });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error from AI provider";
        send({ type: "error", message });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  request.signal.addEventListener("abort", () => {
    closed = true;
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
