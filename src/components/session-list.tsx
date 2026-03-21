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
            gridTemplateColumns: "20px 1fr 140px 80px 60px 50px 80px",
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
          <span>project</span>
          <span>branch</span>
          <span style={{ textAlign: "right" }}>tokens</span>
          <span style={{ textAlign: "right" }}>tools</span>
          <span style={{ textAlign: "right" }}>files</span>
          <span style={{ textAlign: "right" }}>when</span>
        </div>

        {/* Session rows */}
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
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
