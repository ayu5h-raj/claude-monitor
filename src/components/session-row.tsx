import Link from "next/link";
import { formatTokenCount, getModelContextLimit } from "@/lib/path-utils";
import { BookmarkButton } from "@/src/components/bookmark-button";
import { TagPills } from "@/src/components/tag-pills";

interface SessionRowProps {
  session: {
    id: string;
    project: string;
    projectPath: string;
    branch: string;
    status: "active" | "completed";
    lastActiveAt: string;
    toolCallCount: number;
    tokenUsage: { input: number; output: number; cacheRead: number; cacheCreation: number };
    filesChanged: string[];
    contextSize: number;
    model: string;
    firstMessage?: string;
  };
  showSummary?: boolean;
  bookmarked?: boolean;
  tags?: string[];
  hasNotes?: boolean;
  notesPreview?: string;
  returnUrl: string;
  projectPath: string;
}

function getRelativeTime(isoStr: string): string {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export default function SessionRow({
  session,
  showSummary,
  bookmarked,
  tags,
  hasNotes,
  notesPreview,
  returnUrl,
  projectPath,
}: SessionRowProps) {
  const totalTokens =
    session.tokenUsage.input +
    session.tokenUsage.output +
    session.tokenUsage.cacheRead +
    session.tokenUsage.cacheCreation;

  return (
    <Link
      href={`/sessions/${session.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr 140px 80px 55px 60px 50px 80px 60px",
        alignItems: "center",
        gap: "0 12px",
        padding: "8px 16px",
        borderBottom: "1px solid var(--border-light)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background:
            session.status === "active"
              ? "var(--green)"
              : "var(--text-muted)",
          boxShadow:
            session.status === "active"
              ? "0 0 4px var(--green)"
              : "none",
        }}
      />
      <span
        style={{
          color: showSummary && session.firstMessage ? "var(--text-secondary)" : "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: showSummary ? "12px" : undefined,
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        title={showSummary ? session.firstMessage : session.project}
      >
        <BookmarkButton sessionId={session.id} bookmarked={bookmarked || false} returnUrl={returnUrl} size="sm" />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {showSummary ? (session.firstMessage || session.project) : session.project}
        </span>
        {tags && tags.length > 0 && (
          <TagPills tags={tags} />
        )}
      </span>
      <span
        style={{
          color: "var(--text-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "12px",
        }}
      >
        {session.branch}
      </span>
      <span style={{ color: "var(--amber)", textAlign: "right", fontSize: "12px" }}>
        {formatTokenCount(totalTokens)}
      </span>
      <span
        style={{ color: "var(--green)", textAlign: "right", fontSize: "12px" }}
        title={session.contextSize > 0 ? `${formatTokenCount(session.contextSize)} / ${formatTokenCount(getModelContextLimit(session.model))}` : ""}
      >
        {session.contextSize > 0 ? formatTokenCount(session.contextSize) : "—"}
      </span>
      <span style={{ color: "var(--blue)", textAlign: "right", fontSize: "12px" }}>
        {session.toolCallCount}
      </span>
      <span style={{ color: "var(--purple)", textAlign: "right", fontSize: "12px" }}>
        {session.filesChanged.length || "—"}
      </span>
      <span style={{ color: "var(--text-muted)", textAlign: "right", fontSize: "12px" }}>
        {getRelativeTime(session.lastActiveAt)}
      </span>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
        {hasNotes && (
          <span
            style={{ color: "#ffaa00", fontSize: "11px", position: "relative" }}
            data-tooltip={notesPreview}
            className="notes-tooltip"
          >
            ✎
          </span>
        )}
        <span
          data-copy-resume=""
          data-cmd={`cd "${session.projectPath}" && claude --resume ${session.id}`}
          title="Copy resume command"
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
            textAlign: "center",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          &#9654;
        </span>
        <details data-more-actions style={{ position: "relative", display: "inline-block" }}>
          <summary style={{ cursor: "pointer", color: "#555", fontSize: "14px", listStyle: "none", padding: "0 4px" }}>
            ⋯
          </summary>
          <div style={{
            position: "absolute", right: 0, top: "100%",
            background: "#111", border: "1px solid #333", borderRadius: "3px",
            padding: "4px 0", zIndex: 10, minWidth: "140px",
          }}>
            <button data-copy-action={`cd "${projectPath}"`} data-copy-label="cd command"
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#888", padding: "4px 12px", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}>
              Terminal
            </button>
            <button data-copy-action={`code "${projectPath}"`} data-copy-label="code command"
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#888", padding: "4px 12px", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}>
              VS Code
            </button>
          </div>
        </details>
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  document.querySelectorAll('details[data-more-actions]').forEach(function(d) {
    if (d.__moreActionsInit) return;
    d.__moreActionsInit = true;
    d.addEventListener('click', function(e) { e.stopPropagation(); e.preventDefault(); });
    d.querySelector('summary').addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      var det = e.currentTarget.parentElement;
      det.open = !det.open;
    });
    d.querySelectorAll('[data-copy-action]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var text = e.currentTarget.getAttribute('data-copy-action');
        var label = e.currentTarget.getAttribute('data-copy-label');
        if (window.__copyToClipboard) window.__copyToClipboard(text, label);
        d.removeAttribute('open');
      });
    });
  });
})();
`}} />
      </span>
    </Link>
  );
}
