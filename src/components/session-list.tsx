import Sidebar from "@/src/components/sidebar";
import SessionRow from "@/src/components/session-row";
import type { SessionMetadata } from "@/lib/types";

interface SerializedSession {
  id: string;
  project: string;
  projectPath: string;
  worktree?: string;
  branch: string;
  startedAt: string;
  lastActiveAt: string;
  messageCount: number;
  toolCallCount: number;
  tokenUsage: { input: number; output: number; cacheRead: number; cacheCreation: number };
  model: string;
  status: "active" | "completed";
  activeState?: "working" | "waiting" | "thinking" | "idle";
  filesChanged: string[];
  contextSize: number;
  firstMessage?: string;
}

interface SerializedRepo {
  name: string;
  path: string;
  sessionCount: number;
  lastActiveAt: string;
  worktrees: Array<{ name: string; sessionCount: number; lastActiveAt: string }>;
}

interface SessionListProps {
  sessions: SerializedSession[];
  repos: SerializedRepo[];
  selectedRepo?: string;
  selectedBranch?: string;
  todayStats?: { sessions: number; tokens: number; toolCalls: number };
  allMetadata: Record<string, SessionMetadata>;
  bookmarkCount: number;
  tagCounts: { tag: string; count: number }[];
  selectedTag?: string;
  showBookmarked?: boolean;
}

export default function SessionList({
  sessions,
  repos,
  selectedRepo,
  selectedBranch,
  todayStats,
  allMetadata,
  bookmarkCount,
  tagCounts,
  selectedTag,
  showBookmarked,
}: SessionListProps) {
  const hasFilter = selectedRepo || selectedBranch || showBookmarked || selectedTag;
  const selectedRepoName = repos.find((r) => r.path === selectedRepo)?.name;

  // Build returnUrl from current filter state
  const params: string[] = [];
  if (selectedRepo) params.push(`repo=${encodeURIComponent(selectedRepo)}`);
  if (selectedBranch) params.push(`branch=${encodeURIComponent(selectedBranch)}`);
  if (showBookmarked) params.push("bookmarked=true");
  if (selectedTag) params.push(`tag=${encodeURIComponent(selectedTag)}`);
  const returnUrl = params.length > 0 ? `/?${params.join("&")}` : "/";

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 45px)",
        overflow: "hidden",
      }}
    >
      <Sidebar
        repos={repos}
        selectedRepo={selectedRepo}
        selectedBranch={selectedBranch}
        todayStats={todayStats}
        bookmarkCount={bookmarkCount}
        tagCounts={tagCounts}
        selectedTag={selectedTag}
        showBookmarked={showBookmarked}
      />

      {/* Drag handle for sidebar resize */}
      <div
        id="sidebar-drag"
        style={{
          width: "5px",
          cursor: "col-resize",
          background: "var(--border)",
          flexShrink: 0,
        }}
      />
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var handle = document.getElementById('sidebar-drag');
  var sidebar = document.getElementById('sidebar');
  if (!handle || !sidebar) return;
  var dragging = false, startX = 0, startW = 0;
  handle.addEventListener('mousedown', function(e) {
    dragging = true; startX = e.clientX; startW = sidebar.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var w = Math.max(180, Math.min(startW + e.clientX - startX, window.innerWidth * 0.5));
    sidebar.style.width = w + 'px';
    sidebar.style.minWidth = w + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
  handle.addEventListener('mouseenter', function() { handle.style.background = 'var(--green)'; });
  handle.addEventListener('mouseleave', function() { if (!dragging) handle.style.background = 'var(--border)'; });
})();
      `}} />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Filter breadcrumb */}
        {hasFilter && (
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border-light)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--text-muted)",
              background: "var(--bg-secondary)",
            }}
          >
            <span>filter:</span>
            {selectedRepo && (
              <span style={{ color: "var(--text-secondary)" }}>
                {selectedRepoName ?? selectedRepo}
              </span>
            )}
            {selectedRepo && selectedBranch && (
              <span style={{ color: "var(--text-muted)" }}>/</span>
            )}
            {selectedBranch && (
              <span style={{ color: "var(--text-secondary)" }}>
                {selectedBranch}
              </span>
            )}
            {showBookmarked && (
              <span style={{ color: "#ffaa00" }}>★ bookmarked</span>
            )}
            {selectedTag && (
              <span style={{ color: "var(--text-secondary)" }}>
                tag:{selectedTag}
              </span>
            )}
          </div>
        )}

        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr 140px 80px 55px 60px 50px 80px 60px",
            gap: "0 12px",
            padding: "6px 16px",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: "11px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "var(--bg-secondary)",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <span />
          <span>{selectedRepo ? "session" : "project"}</span>
          <span>branch</span>
          <span style={{ textAlign: "right" }}>tokens</span>
          <span style={{ textAlign: "right" }}>ctx</span>
          <span style={{ textAlign: "right" }}>tools</span>
          <span style={{ textAlign: "right" }}>files</span>
          <span style={{ textAlign: "right" }}>when</span>
          <span />
        </div>

        {/* Session rows */}
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const meta = allMetadata[session.id];
            const notesText = meta?.notes || "";
            return (
              <SessionRow
                key={session.id}
                session={session}
                showSummary={!!selectedRepo}
                bookmarked={meta?.bookmarked}
                tags={meta?.tags}
                hasNotes={!!notesText}
                notesPreview={notesText ? notesText.slice(0, 80) : undefined}
                returnUrl={returnUrl}
                projectPath={session.projectPath}
              />
            );
          })
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {hasFilter
              ? "no sessions match the current filter"
              : "no sessions found"}
          </div>
        )}
      </div>
    </div>
  );
}
