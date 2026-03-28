"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { renderMessageContent } from "@/src/components/message-renderer";

interface InsightsPanelProps {
  sessionId: string;
  cachedContent: string | null;
  cachedModel: string | null;
  cachedAt: string | null;
}

export default function InsightsPanel({
  sessionId,
  cachedContent,
  cachedModel,
  cachedAt,
}: InsightsPanelProps) {
  const [content, setContent] = useState(cachedContent || "");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCached, setShowCached] = useState(!!cachedContent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const generate = useCallback(() => {
    setContent("");
    setError(null);
    setIsStreaming(true);
    setShowCached(false);

    const es = new EventSource(`/api/sessions/${sessionId}/insights/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chunk" && data.text) {
          setContent((prev) => prev + data.text);
        } else if (data.type === "complete") {
          setIsStreaming(false);
          setShowCached(true);
          es.close();
        } else if (data.type === "error") {
          setError(data.message || "Generation failed");
          setIsStreaming(false);
          es.close();
        }
      } catch {
        // Parse error
      }
    };

    es.onerror = () => {
      if (isStreaming) {
        setError("Connection lost during generation");
        setIsStreaming(false);
      }
      es.close();
    };
  }, [sessionId, isStreaming]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  // Render mermaid diagrams after content updates (only when not streaming)
  useEffect(() => {
    if (!isStreaming && content && scrollRef.current) {
      const mermaidDivs = scrollRef.current.querySelectorAll(".mermaid:not([data-processed])");
      if (mermaidDivs.length > 0 && typeof window !== "undefined" && (window as unknown as Record<string, unknown>).mermaid) {
        const mermaidLib = (window as unknown as Record<string, { run: (opts: { nodes: NodeListOf<Element> }) => void }>).mermaid;
        mermaidLib.run({ nodes: mermaidDivs });
      }
    }
  }, [content, isStreaming]);

  // No content and not streaming — show generate button
  if (!content && !isStreaming && !error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 32px",
          gap: "16px",
        }}
      >
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "13px",
            textAlign: "center",
            maxWidth: "400px",
            lineHeight: "1.6",
          }}
        >
          Generate an AI-powered analysis of this session&apos;s decision-making
          process — the goals, approach, key decisions, and outcomes.
        </div>
        <button
          onClick={generate}
          style={{
            background: "rgba(0,255,65,0.1)",
            border: "1px solid var(--green)",
            color: "var(--green)",
            padding: "10px 24px",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "13px",
            letterSpacing: "0.04em",
          }}
        >
          [ Generate Insights ]
        </button>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        padding: "16px",
        overflow: "auto",
        height: "100%",
      }}
    >
      {/* Status bar */}
      {isStreaming && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            marginBottom: "12px",
            background: "rgba(0,255,65,0.06)",
            border: "1px solid rgba(0,255,65,0.2)",
            borderRadius: "4px",
            fontSize: "11px",
          }}
        >
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
          <span style={{ color: "var(--green)" }}>generating insights...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "12px",
            background: "rgba(255,60,60,0.08)",
            border: "1px solid rgba(255,60,60,0.3)",
            borderRadius: "4px",
            fontSize: "12px",
            color: "var(--red, #ff3c3c)",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Generation failed
          </div>
          <div style={{ color: "var(--text-secondary)" }}>{error}</div>
          <div
            style={{
              marginTop: "8px",
              color: "var(--text-muted)",
              fontSize: "11px",
            }}
          >
            Check your AI provider configuration at{" "}
            <a href="/config" style={{ color: "var(--green)" }}>
              /config
            </a>
          </div>
        </div>
      )}

      {/* Content */}
      {content && (
        <div
          style={{
            borderLeft: "2px solid var(--purple)",
            padding: "8px 12px",
          }}
        >
          {showCached && cachedModel && cachedAt && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                fontSize: "10px",
                color: "var(--text-muted)",
              }}
            >
              <span>
                generated by{" "}
                <span style={{ color: "var(--blue)" }}>{cachedModel}</span>
              </span>
              <span>|</span>
              <span>{cachedAt?.slice(0, 16).replace("T", " ")}</span>
              <span>|</span>
              <button
                onClick={generate}
                disabled={isStreaming}
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  cursor: isStreaming ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  fontSize: "10px",
                }}
              >
                regenerate
              </button>
            </div>
          )}
          <div
            className="conv-entry-content"
            style={{ fontSize: "12px" }}
            dangerouslySetInnerHTML={{
              __html: renderMessageContent(content),
            }}
          />
        </div>
      )}

      {/* Retry button after error */}
      {error && !isStreaming && (
        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <button
            onClick={generate}
            style={{
              background: "rgba(0,255,65,0.1)",
              border: "1px solid var(--green)",
              color: "var(--green)",
              padding: "8px 20px",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "12px",
            }}
          >
            [ Retry ]
          </button>
        </div>
      )}
    </div>
  );
}
