export const dynamic = "force-dynamic";

import Link from "next/link";
import { getFileHistory, getProjects } from "@/lib/claude-data";

function shortenPath(filePath: string): string {
  const parts = filePath.split("/");
  const markers = ["github", "Documents", "projects", "repos"];
  for (let i = 0; i < parts.length; i++) {
    if (markers.includes(parts[i]) && i + 1 < parts.length) {
      return parts.slice(i + 1).join("/");
    }
  }
  if (parts.length > 4) return parts.slice(3).join("/");
  return filePath;
}

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; repo?: string }>;
}) {
  const { q, repo } = await searchParams;

  // Only load file history when a repo is selected (avoids loading all sessions upfront)
  const projects = await getProjects();
  const repoNames = projects.map((p) => p.name);

  let filtered: Awaited<ReturnType<typeof getFileHistory>> = [];
  if (repo) {
    const files = await getFileHistory();
    filtered = files.filter((f) =>
      f.sessions.some((s) => s.project === repo)
    );
    if (q) {
      filtered = filtered.filter((f) =>
        f.filePath.toLowerCase().includes(q.toLowerCase())
      );
    }
  }

  return (
    <div style={{ padding: "16px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Search bar + repo filter — uses native form (no JS needed) */}
      <form
        action="/files"
        method="GET"
        style={{ marginBottom: "16px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "8px 12px",
          }}
        >
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>$</span>

          {/* Repo dropdown — auto-submits via inline script below */}
          <select
            name="repo"
            defaultValue={repo || ""}
            id="repo-select"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              color: repo ? "var(--green)" : "var(--text-muted)",
              fontSize: "12px",
              fontFamily: "inherit",
              padding: "2px 4px",
              cursor: "pointer",
              outline: "none",
              flexShrink: 0,
            }}
          >
            <option value="">select repo...</option>
            {repoNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {/* Search input */}
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="search files... (e.g. login.ts, src/auth/) — press Enter"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          {(q || repo) && (
            <Link
              href="/files"
              style={{
                color: "var(--text-muted)",
                fontSize: "11px",
                textDecoration: "none",
              }}
            >
              clear
            </Link>
          )}
        </div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            marginTop: "6px",
          }}
        >
          {repo ? (
            <>
              {filtered.length} file{filtered.length !== 1 ? "s" : ""} found
              {" "}in <span style={{ color: "var(--green)" }}>{repo}</span>
            </>
          ) : (
            <>{repoNames.length} repos available</>
          )}
        </div>
      </form>


      {/* Results */}
      <div>
        {filtered.map((file) => (
          <details key={file.filePath} style={{ marginBottom: "2px" }}>
            <summary
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                cursor: "pointer",
                listStyle: "none",
                borderBottom: "1px solid var(--border-light)",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
                title={file.filePath}
              >
                {shortenPath(file.filePath)}
              </span>
              <span
                style={{
                  color: "var(--purple)",
                  fontSize: "11px",
                  flexShrink: 0,
                  marginLeft: "12px",
                }}
              >
                {file.sessions.length} session{file.sessions.length !== 1 ? "s" : ""}
              </span>
            </summary>

            <div
              style={{
                padding: "8px 12px 12px 24px",
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              {file.sessions.map((s) => (
                <Link
                  key={s.sessionId}
                  href={`/sessions/${s.sessionId}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "4px 0",
                    textDecoration: "none",
                    color: "inherit",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "var(--green)" }}>{s.project}</span>
                  <span style={{ color: "var(--text-muted)" }}>{s.branch}</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                    {s.lastActiveAt.slice(0, 10)}
                  </span>
                </Link>
              ))}
            </div>
          </details>
        ))}

        {!repo && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            select a repo to view changed files
          </div>
        )}
        {repo && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            {q
              ? "no files match your search"
              : "no files changed in any session"}
          </div>
        )}
      </div>
    </div>
  );
}
