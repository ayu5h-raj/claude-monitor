import fs from "fs/promises";
import { watch } from "fs";
import {
  parseJSONLContent,
  mapRawEntriesToSessionEntries,
} from "@/lib/jsonl-parser";
import { findSessionFile, isSessionActive, getNewLines } from "@/lib/sse-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const filePath = await findSessionFile(id);
  if (!filePath) {
    return new Response("Session not found", { status: 404 });
  }

  const active = await isSessionActive(id);
  if (!active) {
    return new Response("Session is not active", { status: 409 });
  }

  // Read baseline
  const initialContent = await fs.readFile(filePath, "utf-8");
  const initialLines = initialContent.split("\n").filter((l) => l.trim());
  let baselineCount = initialLines.length;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // File watcher with debounce
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const watcher = watch(filePath, () => {
        if (closed) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          if (closed) return;
          try {
            const content = await fs.readFile(filePath, "utf-8");
            const newLines = getNewLines(content, baselineCount);
            if (newLines.length === 0) return;

            const rawEntries = parseJSONLContent(newLines.join("\n"));
            const entries = mapRawEntriesToSessionEntries(rawEntries);
            baselineCount += newLines.length;

            for (const entry of entries) {
              const serialized = {
                ...entry,
                timestamp:
                  entry.timestamp instanceof Date
                    ? entry.timestamp.toISOString()
                    : entry.timestamp,
              };
              const msg = JSON.stringify({
                type: "new_entry",
                entry: serialized,
                timestamp: new Date().toISOString(),
              });
              controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
            }
          } catch {
            // File read error — ignore
          }
        }, 200);
      });

      // Session completion check every 5 seconds
      const completionInterval = setInterval(async () => {
        if (closed) return;
        const stillActive = await isSessionActive(id);
        if (!stillActive) {
          const msg = JSON.stringify({
            type: "session_complete",
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
          cleanup();
        }
      }, 5000);

      // Heartbeat every 15 seconds
      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        const msg = JSON.stringify({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      }, 15000);

      function cleanup() {
        if (closed) return;
        closed = true;
        watcher.close();
        if (debounceTimer) clearTimeout(debounceTimer);
        clearInterval(completionInterval);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }

      // Handle client disconnect
      request.signal.addEventListener("abort", cleanup);
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
