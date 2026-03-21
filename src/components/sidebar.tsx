import Link from "next/link";
import { formatTokenCount } from "@/lib/path-utils";

interface SerializedRepo {
  name: string;
  path: string;
  sessionCount: number;
  lastActiveAt: string;
  worktrees: Array<{ name: string; sessionCount: number; lastActiveAt: string }>;
}

interface SidebarProps {
  repos: SerializedRepo[];
  selectedRepo?: string;
  selectedBranch?: string;
  todayStats?: { sessions: number; tokens: number; toolCalls: number };
}

export default function Sidebar({
  repos,
  selectedRepo,
  selectedBranch,
  todayStats,
}: SidebarProps) {
  const isAllActive = !selectedRepo && !selectedBranch;

  return (
    <aside
      id="sidebar"
      style={{
        width: "260px",
        minWidth: "180px",
        maxWidth: "50vw",
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 12px 8px",
          borderBottom: "1px solid var(--border-light)",
          color: "var(--text-muted)",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Repositories
      </div>

      {/* Repo list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {/* All repos option */}
        <Link
          href="/"
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: isAllActive ? "var(--green-dim)" : "transparent",
            borderLeft: isAllActive
              ? "2px solid var(--green)"
              : "2px solid transparent",
            color: isAllActive ? "var(--green)" : "var(--text-secondary)",
            padding: "6px 12px 6px 10px",
            cursor: "pointer",
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          $ all repos
        </Link>

        {/* Individual repos */}
        {repos.map((repo) => {
          const isRepoActive =
            selectedRepo === repo.path && !selectedBranch;

          return (
            <details
              key={repo.path}
              open={selectedRepo === repo.path || undefined}
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Link
                  href={`/?repo=${encodeURIComponent(repo.path)}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    background: isRepoActive ? "var(--green-dim)" : "transparent",
                    borderLeft: isRepoActive
                      ? "2px solid var(--green)"
                      : "2px solid transparent",
                    padding: "6px 10px",
                    fontSize: "13px",
                    textDecoration: "none",
                    color: "inherit",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "10px",
                      flexShrink: 0,
                      width: "12px",
                    }}
                  >
                    ▶
                  </span>
                  <span
                    style={{
                      flex: 1,
                      color: isRepoActive
                        ? "var(--green)"
                        : "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {repo.name}
                  </span>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      flexShrink: 0,
                    }}
                  >
                    {repo.sessionCount}
                  </span>
                </Link>
              </summary>

              {/* Worktree/branch entries */}
              {repo.worktrees.map((wt) => {
                const isBranchActive =
                  selectedRepo === repo.path && selectedBranch === wt.name;
                return (
                  <Link
                    key={wt.name}
                    href={`/?repo=${encodeURIComponent(repo.path)}&branch=${encodeURIComponent(wt.name)}`}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: isBranchActive
                        ? "var(--green-dim)"
                        : "transparent",
                      borderLeft: isBranchActive
                        ? "2px solid var(--green)"
                        : "2px solid transparent",
                      color: isBranchActive
                        ? "var(--green)"
                        : "var(--text-muted)",
                      padding: "4px 10px 4px 28px",
                      cursor: "pointer",
                      fontSize: "12px",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {wt.name}
                    </span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "11px",
                        flexShrink: 0,
                        marginLeft: "4px",
                      }}
                    >
                      {wt.sessionCount}
                    </span>
                  </Link>
                );
              })}
            </details>
          );
        })}
      </div>

      {/* Bottom stats */}
      {todayStats && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "10px 12px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <div
            style={{
              color: "var(--text-muted)",
              marginBottom: "6px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontSize: "10px",
            }}
          >
            Today
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>sessions</span>
              <span style={{ color: "var(--green)" }}>{todayStats.sessions}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>tokens</span>
              <span style={{ color: "var(--amber)" }}>
                {formatTokenCount(todayStats.tokens)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>tool calls</span>
              <span style={{ color: "var(--blue)" }}>{todayStats.toolCalls}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
