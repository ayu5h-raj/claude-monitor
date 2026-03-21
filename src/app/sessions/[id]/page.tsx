import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionDetail } from "@/lib/claude-data";
import ConversationEntry from "@/src/components/conversation-entry";
import { formatTokenCount, formatDuration } from "@/lib/path-utils";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSessionDetail(id);
  if (!result) notFound();
  const { session, entries } = result;

  const totalTokens =
    session.tokenUsage.input +
    session.tokenUsage.output +
    session.tokenUsage.cacheRead +
    session.tokenUsage.cacheCreation;

  const durationMs =
    session.lastActiveAt.getTime() - session.startedAt.getTime();

  const startedIso = session.startedAt.toISOString();
  const startedDate = startedIso.slice(0, 10); // "YYYY-MM-DD"
  const startedTime = startedIso.slice(11, 16); // "HH:MM"

  const serializedEntries = entries.map((e) => ({
    ...e,
    timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
  })).reverse(); // Latest first

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "12px",
          }}
        >
          ← back
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              margin: "0",
              fontSize: "16px",
              fontWeight: "bold",
              color: "var(--text-primary)",
            }}
          >
            {session.project}
          </h1>
          {session.branch && (
            <span
              style={{
                color: "var(--green)",
                fontSize: "12px",
              }}
            >
              {session.branch}
            </span>
          )}
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              fontFamily: "monospace",
            }}
          >
            {session.id.slice(0, 8)}
          </span>
          <span
            id="resume-copy-btn"
            data-cmd={`cd "${session.projectPath}" && claude --resume ${session.id}`}
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              cursor: "pointer",
              padding: "2px 6px",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              marginLeft: "4px",
            }}
          >
            [ copy resume cmd ]
          </span>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var btn = document.getElementById('resume-copy-btn');
  if (!btn) return;
  btn.addEventListener('mouseenter', function() { btn.style.borderColor = 'var(--green)'; btn.style.color = 'var(--green)'; });
  btn.addEventListener('mouseleave', function() { btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--text-muted)'; });
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    var cmd = btn.getAttribute('data-cmd');
    if (window.__copyCmd) {
      window.__copyCmd(cmd, btn, 'button');
    }
  });
})();
        `}} />
      </div>

      {/* Metadata row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          padding: "12px",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        <div style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>started </span>
          {startedDate} {startedTime}
        </div>
        <div style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>duration </span>
          {formatDuration(durationMs)}
        </div>
        <div style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>messages </span>
          {session.messageCount}
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>tokens </span>
          <span style={{ color: "var(--amber)" }}>
            {formatTokenCount(totalTokens)}
          </span>
        </div>
        {session.model && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>model </span>
            <span style={{ color: "#00aaff" }}>{session.model}</span>
          </div>
        )}
        <div style={{ width: "100%" }}>
          <span style={{ color: "var(--text-muted)" }}>cwd </span>
          <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
            {session.projectPath}
          </span>
        </div>
      </div>

      {/* Files changed */}
      {session.filesChanged.length > 0 && (
        <div
          style={{
            marginBottom: "24px",
            padding: "12px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              color: "var(--purple)",
              fontSize: "11px",
              fontWeight: "bold",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            FILES CHANGED ({session.filesChanged.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {session.filesChanged.map((filePath) => {
              const fileName = filePath.split("/").pop() || filePath;
              return (
                <Link
                  key={filePath}
                  href={`/files?q=${encodeURIComponent(fileName)}`}
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    textDecoration: "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {filePath}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation entries */}
      <div>
        {serializedEntries.map((entry, i) => (
          <ConversationEntry
            key={`${entry.uuid}-${i}`}
            entry={entry}
          />
        ))}
        {serializedEntries.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "32px",
            }}
          >
            No conversation entries found.
          </div>
        )}
      </div>
    </div>
  );
}
