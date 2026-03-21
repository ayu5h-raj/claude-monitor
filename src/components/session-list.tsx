import Sidebar from "@/src/components/sidebar";
import SessionRow from "@/src/components/session-row";

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
  filesChanged: string[];
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
}

export default function SessionList({
  sessions,
  repos,
  selectedRepo,
  selectedBranch,
  todayStats,
}: SessionListProps) {
  const hasFilter = selectedRepo || selectedBranch;
  const selectedRepoName = repos.find((r) => r.path === selectedRepo)?.name;

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
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  window.__showCopyToast = function(cmd) {
    var existing = document.getElementById('copy-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;background:#0a0a0a;border:1px solid #00ff41;border-radius:4px;padding:10px 14px;font-family:monospace;font-size:12px;max-width:420px;box-shadow:0 4px 12px rgba(0,255,65,0.15);opacity:0;transform:translateY(-8px);transition:opacity 0.2s,transform 0.2s;';
    var line1 = document.createElement('div');
    line1.style.cssText = 'color:#00ff41;margin-bottom:4px;font-size:11px;';
    line1.textContent = '$ copied to clipboard';
    var line2 = document.createElement('div');
    line2.style.cssText = 'color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    line2.textContent = cmd;
    toast.appendChild(line1);
    toast.appendChild(line2);
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(function() {
      toast.style.opacity = '0'; toast.style.transform = 'translateY(-8px)';
      setTimeout(function() { toast.remove(); }, 200);
    }, 2000);
  };

  function copyCmd(cmd, btn, origContent) {
    function onSuccess() {
      btn.textContent = origContent === 'icon' ? '\\u2713' : '[ copied! ]';
      btn.style.color = 'var(--green)';
      window.__showCopyToast(cmd);
      setTimeout(function() {
        if (origContent === 'icon') { btn.innerHTML = '\\u25b6'; } else { btn.textContent = '[ copy resume cmd ]'; }
        btn.style.color = 'var(--text-muted)';
        if (btn.style.borderColor) btn.style.borderColor = 'var(--border)';
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd).then(onSuccess);
    } else {
      var ta = document.createElement('textarea');
      ta.value = cmd; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      onSuccess();
    }
  }
  window.__copyCmd = copyCmd;

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-copy-resume]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    copyCmd(btn.getAttribute('data-cmd'), btn, 'icon');
  });
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
          </div>
        )}

        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr 140px 80px 60px 50px 80px 28px",
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
          <span style={{ textAlign: "right" }}>tools</span>
          <span style={{ textAlign: "right" }}>files</span>
          <span style={{ textAlign: "right" }}>when</span>
          <span />
        </div>

        {/* Session rows */}
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionRow key={session.id} session={session} showSummary={!!selectedRepo} />
          ))
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
