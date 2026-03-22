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
  bookmarkCount: number;
  tagCounts: { tag: string; count: number }[];
  selectedTag?: string;
  showBookmarked?: boolean;
}

export default function Sidebar({
  repos,
  selectedRepo,
  selectedBranch,
  todayStats,
  bookmarkCount,
  tagCounts,
  selectedTag,
  showBookmarked,
}: SidebarProps) {
  const isAllActive = !selectedRepo && !selectedBranch;

  return (
    <aside
      id="sidebar"
      style={{
        width: "300px",
        minWidth: "300px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
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
              data-repo-details
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "default",
                  padding: 0,
                }}
              >
                <div
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
                    gap: "6px",
                  }}
                >
                  <span
                    data-repo-toggle
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "10px",
                      flexShrink: 0,
                      width: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    ▶
                  </span>
                  <Link
                    href={isRepoActive ? "/" : `/?repo=${encodeURIComponent(repo.path)}`}
                    data-repo-link
                    style={{
                      flex: 1,
                      color: isRepoActive
                        ? "var(--green)"
                        : "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                    }}
                  >
                    {repo.name}
                  </Link>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      flexShrink: 0,
                    }}
                  >
                    {repo.sessionCount}
                  </span>
                </div>
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

      {/* Bookmarks */}
      <div style={{ borderTop: "1px solid #222", padding: "12px 16px" }}>
        <a
          href="/?bookmarked=true"
          style={{
            color: showBookmarked ? "#00ff41" : "#888",
            textDecoration: "none",
            fontSize: "12px",
            display: "block",
            padding: "4px 0",
            borderLeft: showBookmarked ? "2px solid #00ff41" : "2px solid transparent",
            paddingLeft: "8px",
          }}
        >
          ★ Bookmarked ({bookmarkCount})
        </a>
      </div>

      {/* Tags */}
      {tagCounts.length > 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ color: "#555", fontSize: "10px", textTransform: "uppercase", marginBottom: "4px" }}>
            Tags
          </div>
          {tagCounts.map(({ tag, count }) => (
            <a
              key={tag}
              href={`/?tag=${tag}`}
              style={{
                color: selectedTag === tag ? "#00ff41" : "#888",
                textDecoration: "none",
                fontSize: "12px",
                display: "block",
                padding: "2px 0 2px 8px",
                borderLeft: selectedTag === tag ? "2px solid #00ff41" : "2px solid transparent",
              }}
            >
              {tag} ({count})
            </a>
          ))}
        </div>
      )}

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
