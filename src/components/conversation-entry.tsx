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
      <div className={`conv-entry conv-entry-user`}>
        <div className="conv-entry-header">
          <span className="conv-entry-type" style={{ color: "var(--green)" }}>
            USER
          </span>
          <span className="conv-entry-time">{timeStr}</span>
        </div>
        <div className="conv-entry-content">{entry.content}</div>
      </div>
    );
  }

  if (entry.type === "assistant") {
    const totalTokens = entry.usage
      ? entry.usage.input + entry.usage.output
      : 0;

    return (
      <div className={`conv-entry conv-entry-assistant`}>
        <div className="conv-entry-header">
          <span className="conv-entry-type" style={{ color: "var(--purple)" }}>
            ASSISTANT
          </span>
          <span className="conv-entry-time">{timeStr}</span>
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
        <div className="conv-entry-content">{entry.content}</div>
      </div>
    );
  }

  if (entry.type === "tool_use") {
    return (
      <div className={`conv-entry conv-entry-tool_use`}>
        <div className="conv-entry-header">
          <span className="conv-entry-type" style={{ color: "var(--amber)" }}>
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
          <span className="conv-entry-time">{timeStr}</span>
        </div>
        {entry.toolInput && (
          <details>
            <summary>show input</summary>
            <pre>{JSON.stringify(entry.toolInput, null, 2)}</pre>
          </details>
        )}
      </div>
    );
  }

  if (entry.type === "tool_result") {
    const output = entry.toolResult ?? entry.content;
    const charCount = output ? output.length : 0;

    return (
      <div className={`conv-entry conv-entry-tool_result`}>
        <div className="conv-entry-header">
          <span className="conv-entry-type" style={{ color: "var(--amber)" }}>
            RESULT
          </span>
          <span className="conv-entry-time">{timeStr}</span>
          {entry.isError ? (
            <span style={{ color: "var(--red)", fontSize: "12px" }} title="error">
              &#10007;
            </span>
          ) : (
            <span style={{ color: "var(--green)", fontSize: "12px" }} title="success">
              &#10003;
            </span>
          )}
        </div>
        {output && (
          <details>
            <summary>show output ({charCount} chars)</summary>
            <pre>{output}</pre>
          </details>
        )}
      </div>
    );
  }

  return null;
}
