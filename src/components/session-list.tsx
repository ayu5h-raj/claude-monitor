import Sidebar from "@/src/components/sidebar";
import SessionRow from "@/src/components/session-row";
import SearchResults from "@/src/components/search-results";
import type { SessionMetadata, SearchResult } from "@/lib/types";

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
  searchQuery?: string;
  searchResults?: SearchResult[];
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
  searchQuery,
  searchResults,
}: SessionListProps) {
  const hasFilter = selectedRepo || selectedBranch || showBookmarked || selectedTag || searchQuery;
  const selectedRepoName = repos.find((r) => r.path === selectedRepo)?.name;

  // Build returnUrl from current filter state
  const params: string[] = [];
  if (selectedRepo) params.push(`repo=${encodeURIComponent(selectedRepo)}`);
  if (selectedBranch) params.push(`branch=${encodeURIComponent(selectedBranch)}`);
  if (showBookmarked) params.push("bookmarked=true");
  if (selectedTag) params.push(`tag=${encodeURIComponent(selectedTag)}`);
  const returnUrl = params.length > 0 ? `/?${params.join("&")}` : "/";

  // Build clear-search URL (preserves other filters)
  const clearSearchUrl = params.length > 0 ? `/?${params.join("&")}` : "/";

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

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Search bar */}
        <form
          id="search-form"
          method="GET"
          action="/"
          style={{
            padding: "6px 16px",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-secondary)",
          }}
        >
          {selectedRepo && <input type="hidden" name="repo" value={selectedRepo} />}
          {selectedBranch && <input type="hidden" name="branch" value={selectedBranch} />}
          {showBookmarked && <input type="hidden" name="bookmarked" value="true" />}
          {selectedTag && <input type="hidden" name="tag" value={selectedTag} />}
          <span id="search-prompt" style={{ color: "var(--text-muted)", fontSize: "12px" }}>$</span>
          <input
            type="text"
            name="q"
            defaultValue={searchQuery || ""}
            placeholder="search sessions..."
            style={{
              flex: 1,
              background: "transparent",
              color: "var(--text-primary)",
              border: "none",
              outline: "none",
              fontSize: "12px",
              fontFamily: "inherit",
            }}
          />
          <button
            id="search-btn"
            type="submit"
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "2px 8px",
              fontSize: "11px",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            [search]
          </button>
          {searchQuery && (
            <a
              href={clearSearchUrl}
              style={{
                color: "var(--text-muted)",
                fontSize: "11px",
                textDecoration: "none",
              }}
            >
              [clear]
            </a>
          )}
        </form>

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
            {searchQuery && (
              <span style={{ color: "var(--green)" }}>
                search: &quot;{searchQuery}&quot;
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

        {/* Content: search results or session rows */}
        {searchQuery && searchResults ? (
          searchResults.length > 0 ? (
            <SearchResults results={searchResults} query={searchQuery} />
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
              no results for &quot;{searchQuery}&quot;
            </div>
          )
        ) : sessions.length > 0 ? (
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
