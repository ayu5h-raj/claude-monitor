"use client";

import { useEffect, useState, useRef } from "react";
import type { SerializedSessionEntry, TokenUsage } from "@/lib/types";
import { renderMessageContent } from "@/src/components/message-renderer";

interface LiveSessionProps {
  sessionId: string;
  initialEntries: SerializedSessionEntry[];
}

function getTimeStr(ts: string): string {
  return ts.slice(11, 19);
}

function formatTokens(usage: TokenUsage | undefined): string {
  if (!usage) return "";
  const total = usage.input + usage.output + usage.cacheRead + usage.cacheCreation;
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(0)}K`;
  return String(total);
}

const borderColors: Record<string, string> = {
  user: "var(--green)",
  assistant: "var(--purple)",
  tool_use: "var(--amber)",
  tool_result: "var(--amber)",
};

const typeLabels: Record<string, string> = {
  user: "USER",
  assistant: "ASSISTANT",
  tool_use: "TOOL",
  tool_result: "RESULT",
};

function EntryView({ entry }: { entry: SerializedSessionEntry }) {
  const borderColor = borderColors[entry.type] || "var(--border)";
  const label = typeLabels[entry.type] || entry.type;
  const timeStr = getTimeStr(entry.timestamp);

  if (entry.type === "user") {
    return (
      <div
        style={{
          borderLeft: `2px solid ${borderColor}`,
          padding: "8px 12px",
          marginBottom: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ color: borderColor, fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em" }}>
            {label}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{timeStr}</span>
        </div>
        <div className="conv-entry-content" style={{ fontSize: "12px" }}
             dangerouslySetInnerHTML={{ __html: renderMessageContent(entry.content) }} />
      </div>
    );
  }

  if (entry.type === "assistant") {
    const tokenStr = formatTokens(entry.usage);
    return (
      <div
        style={{
          borderLeft: `2px solid ${borderColor}`,
          padding: "8px 12px",
          marginBottom: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ color: borderColor, fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em" }}>
            {label}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{timeStr}</span>
          {tokenStr && (
            <span style={{ color: "var(--amber)", fontSize: "10px" }}>{tokenStr}</span>
          )}
        </div>
        <div className="conv-entry-content" style={{ fontSize: "12px" }}
             dangerouslySetInnerHTML={{ __html: renderMessageContent(entry.content) }} />
      </div>
    );
  }

  if (entry.type === "tool_use") {
    return (
      <div
        style={{
          borderLeft: `2px solid ${borderColor}`,
          padding: "8px 12px",
          marginBottom: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: borderColor, fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em" }}>
            {label}
          </span>
          <span style={{ color: "var(--blue)", fontSize: "11px" }}>{entry.toolName}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{timeStr}</span>
        </div>
        {entry.toolInput && (
          <details style={{ marginTop: "4px" }}>
            <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "10px" }}>
              input
            </summary>
            <pre style={{
              fontSize: "10px",
              color: "var(--text-secondary)",
              margin: "4px 0 0",
              padding: "6px",
              background: "var(--bg-tertiary)",
              borderRadius: "3px",
              overflow: "auto",
              maxHeight: "200px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}>
              {JSON.stringify(entry.toolInput, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (entry.type === "tool_result") {
    return (
      <div
        style={{
          borderLeft: `2px solid ${borderColor}`,
          padding: "8px 12px",
          marginBottom: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: borderColor, fontSize: "10px", fontWeight: "bold", letterSpacing: "0.08em" }}>
            {label}
          </span>
          <span style={{ color: entry.isError ? "var(--red)" : "var(--green)", fontSize: "10px" }}>
            {entry.isError ? "✗" : "✓"}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{timeStr}</span>
        </div>
        {entry.content && (
          <details style={{ marginTop: "4px" }}>
            <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "10px" }}>
              output
            </summary>
            <pre style={{
              fontSize: "10px",
              color: "var(--text-secondary)",
              margin: "4px 0 0",
              padding: "6px",
              background: "var(--bg-tertiary)",
              borderRadius: "3px",
              overflow: "auto",
              maxHeight: "200px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}>
              {entry.content}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return null;
}

export default function LiveSession({ sessionId, initialEntries }: LiveSessionProps) {
  const [newEntries, setNewEntries] = useState<SerializedSessionEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_entry" && data.entry) {
          setNewEntries((prev) => [...prev, data.entry]);
        } else if (data.type === "session_complete") {
          setIsComplete(true);
          eventSource.close();
        }
        // heartbeat — ignore
      } catch {
        // Parse error
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0; // entries are reversed (latest first)
    }
  }, [newEntries.length]);

  const allEntries = [...newEntries.map((e) => ({
    ...e,
    _isNew: true as const,
  })).reverse(), ...initialEntries.map((e) => ({
    ...e,
    _isNew: false as const,
  }))];

  return (
    <div ref={scrollRef}>
      {/* Live status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          marginBottom: "8px",
          background: isComplete
            ? "rgba(255,170,0,0.08)"
            : "rgba(0,255,65,0.06)",
          border: `1px solid ${isComplete ? "rgba(255,170,0,0.2)" : "rgba(0,255,65,0.2)"}`,
          borderRadius: "4px",
          fontSize: "11px",
        }}
      >
        {isComplete ? (
          <>
            <span style={{ color: "var(--amber)" }}>session ended</span>
          </>
        ) : (
          <>
            <span
              className="live-dot"
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--green)",
                boxShadow: "0 0 4px var(--green)",
              }}
            />
            <span style={{ color: "var(--green)" }}>live</span>
            {!isConnected && (
              <span style={{ color: "var(--text-muted)" }}>reconnecting...</span>
            )}
            {newEntries.length > 0 && (
              <span style={{ color: "var(--text-muted)" }}>
                +{newEntries.length} new
              </span>
            )}
          </>
        )}
      </div>

      {/* Entries (latest first) */}
      {allEntries.map((entry, i) => (
        <EntryView key={`${entry.uuid}-${i}`} entry={entry} />
      ))}

      {allEntries.length === 0 && (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "32px" }}>
          Waiting for activity...
        </div>
      )}
    </div>
  );
}
