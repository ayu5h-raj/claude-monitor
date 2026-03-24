import { getProjects } from "@/lib/claude-data";

export async function NewSessionDialog() {
  const repos = await getProjects();
  const sorted = repos.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return (
    <dialog
      id="new-session-dialog"
      style={{ outline: "none" }}
    >
      <div style={{ padding: "16px 20px 12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "14px",
              color: "var(--green)",
              fontWeight: "bold",
              letterSpacing: "0.04em",
            }}
          >
            Start New Session
          </h2>
          <button
            data-close-dialog=""
            style={{
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "3px",
            }}
          >
            [close]
          </button>
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}
        >
          Select a repository to open a new Claude Code terminal session:
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            maxHeight: "360px",
            overflowY: "auto",
          }}
        >
          {sorted.length === 0 ? (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                padding: "12px 0",
                textAlign: "center",
              }}
            >
              No projects found in ~/.claude/projects/
            </div>
          ) : (
            sorted.map((repo) => (
              <a
                key={repo.path}
                href={`/terminal/new?cwd=${encodeURIComponent(repo.path)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "3px",
                  border: "1px solid transparent",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  textDecoration: "none",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={undefined}
              >
                <span style={{ color: "var(--green)", fontSize: "10px" }}>
                  &gt;
                </span>
                <span style={{ flex: 1 }}>{repo.name}</span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "10px",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    direction: "rtl",
                    textAlign: "left",
                  }}
                >
                  {repo.path}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}
