import type { SessionEntry } from "@/lib/types";
import { formatTokenCount } from "@/lib/path-utils";

type EntryProp = Omit<SessionEntry, "timestamp"> & { timestamp: string | Date };

// Deterministic time extraction — no toLocaleTimeString (causes hydration mismatch)
function getTimeStr(ts: string | Date): string {
  const iso = typeof ts === "string" ? ts : ts.toISOString();
  return iso.slice(11, 19); // "HH:MM:SS" from ISO string
}

export default function ConversationEntry({ entry }: { entry: EntryProp }) {
  const timeStr = getTimeStr(entry.timestamp);

  if (entry.type === "user") {
    return (
      <div
        style={{
          borderLeft: "2px solid var(--green)",
          paddingLeft: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              color: "var(--green)",
              fontWeight: "bold",
              fontSize: "11px",
              letterSpacing: "0.08em",
            }}
          >
            USER
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {timeStr}
          </span>
        </div>
        <div
          style={{
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {entry.content}
        </div>
      </div>
    );
  }

  if (entry.type === "assistant") {
    const totalTokens = entry.usage
      ? entry.usage.input + entry.usage.output
      : 0;

    return (
      <div
        style={{
          borderLeft: "2px solid var(--purple)",
          paddingLeft: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "var(--purple)",
              fontWeight: "bold",
              fontSize: "11px",
              letterSpacing: "0.08em",
            }}
          >
            ASSISTANT
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {timeStr}
          </span>
          {entry.usage && totalTokens > 0 && (
            <span
              style={{
                color: "var(--amber)",
                fontSize: "10px",
                background: "rgba(255, 170, 0, 0.1)",
                border: "1px solid rgba(255, 170, 0, 0.2)",
                borderRadius: "3px",
                padding: "1px 5px",
              }}
            >
              {formatTokenCount(totalTokens)} tokens
            </span>
          )}
        </div>
        <div
          style={{
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {entry.content}
        </div>
      </div>
    );
  }

  if (entry.type === "tool_use") {
    return (
      <div
        style={{
          borderLeft: "2px solid var(--amber)",
          paddingLeft: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "var(--amber)",
              fontWeight: "bold",
              fontSize: "11px",
              letterSpacing: "0.08em",
            }}
          >
            TOOL
          </span>
          {entry.toolName && (
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {entry.toolName}
            </span>
          )}
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {timeStr}
          </span>
        </div>
        {entry.toolInput && (
          <details>
            <summary
              style={{
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "11px",
                padding: "2px 0",
                listStyle: "none",
              }}
            >
              ▶ show input
            </summary>
            <pre
              style={{
                color: "var(--text-secondary)",
                background: "var(--border-light)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "8px",
                margin: "4px 0 0",
                fontSize: "11px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(entry.toolInput, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (entry.type === "tool_result") {
    const output = entry.toolResult ?? entry.content;
    const charCount = output ? output.length : 0;

    return (
      <div
        style={{
          borderLeft: "2px solid var(--amber)",
          paddingLeft: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "var(--amber)",
              fontWeight: "bold",
              fontSize: "11px",
              letterSpacing: "0.08em",
            }}
          >
            RESULT
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {timeStr}
          </span>
          {entry.isError ? (
            <span
              style={{ color: "var(--red)", fontSize: "12px" }}
              title="error"
            >
              ✗
            </span>
          ) : (
            <span
              style={{ color: "var(--green)", fontSize: "12px" }}
              title="success"
            >
              ✓
            </span>
          )}
        </div>
        {output && (
          <details>
            <summary
              style={{
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "11px",
                padding: "2px 0",
                listStyle: "none",
              }}
            >
              ▶ show output ({charCount} chars)
            </summary>
            <pre
              style={{
                color: "var(--text-secondary)",
                background: "var(--border-light)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "8px",
                margin: "4px 0 0",
                fontSize: "11px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {output}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return null;
}
