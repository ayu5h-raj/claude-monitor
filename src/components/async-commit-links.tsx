import { getSessionDetail } from "@/lib/claude-data";
import { getSessionCommits } from "@/lib/git-commits";
import type { SessionEntry } from "@/lib/types";

const PR_URL_RE = /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/g;

function extractPRs(entries: SessionEntry[]): string[] {
  const urls = new Set<string>();
  for (const entry of entries) {
    if (entry.toolResult) {
      const matches = entry.toolResult.match(PR_URL_RE);
      if (matches) matches.forEach(url => urls.add(url));
    }
    if (entry.content) {
      const matches = entry.content.match(PR_URL_RE);
      if (matches) matches.forEach(url => urls.add(url));
    }
  }
  return Array.from(urls);
}

function parsePRUrl(url: string) {
  const parts = url.split("/");
  const number = parts[parts.length - 1];
  const repo = `${parts[parts.length - 4]}/${parts[parts.length - 3]}`;
  return { number, repo, url };
}

export default async function AsyncCommitLinks({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) return <div style={{ padding: "20px", color: "var(--text-muted)" }}>Session not found</div>;

  const { session, entries } = result;
  const commits = getSessionCommits(
    session.projectPath,
    session.startedAt.toISOString(),
    session.lastActiveAt.toISOString(),
  );
  const prUrls = extractPRs(entries);

  const hasNothing = commits.length === 0 && prUrls.length === 0;

  if (hasNothing) {
    return (
      <div style={{
        padding: "40px 20px",
        color: "var(--text-muted)",
        textAlign: "center",
        fontFamily: "monospace",
        fontSize: "13px",
      }}>
        <div>No commits or pull requests detected in this session.</div>
        <div style={{ fontSize: "11px", marginTop: "8px" }}>
          Commits are matched by timestamp. PRs are extracted from conversation tool results.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      {/* PRs section */}
      {prUrls.length > 0 && (
        <>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: "rgba(170, 136, 255, 0.15)",
              color: "var(--magenta, #aa88ff)",
            }}>
              PR
            </span>
            {prUrls.length} pull request{prUrls.length !== 1 ? "s" : ""} created
          </div>
          {prUrls.map((url) => {
            const pr = parsePRUrl(url);
            return (
              <div
                key={url}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                }}
              >
                <span style={{ color: "var(--magenta, #aa88ff)" }}>#{pr.number}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{pr.repo}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--blue, #00aaff)",
                    fontSize: "11px",
                    marginLeft: "auto",
                  }}
                >
                  [open on github]
                </a>
                <span
                  data-copy-action={url}
                  data-copy-label={`PR #${pr.number}`}
                  style={{
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    padding: "0 4px",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                  }}
                >
                  [copy url]
                </span>
              </div>
            );
          })}
        </>
      )}

      {/* Commits section */}
      {commits.length > 0 && (
        <>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: "rgba(0, 255, 65, 0.15)",
              color: "var(--green)",
            }}>
              GIT
            </span>
            {commits.length} commit{commits.length !== 1 ? "s" : ""} during this session
          </div>

          {commits.map((commit) => (
            <details key={commit.hash} style={{ borderBottom: "1px solid var(--border)" }}>
              <summary style={{
                padding: "10px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "13px",
                fontFamily: "monospace",
              }}>
                <span
                  style={{ color: "var(--green)", fontSize: "12px", minWidth: "60px" }}
                  data-copy-action={commit.hash}
                  data-copy-label={`commit ${commit.shortHash}`}
                >
                  {commit.shortHash}
                </span>
                <span style={{ color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {commit.subject}
                </span>
                {commit.insertions > 0 && (
                  <span style={{ color: "var(--green)", fontSize: "11px" }}>+{commit.insertions}</span>
                )}
                {commit.deletions > 0 && (
                  <span style={{ color: "var(--red)", fontSize: "11px" }}>-{commit.deletions}</span>
                )}
                {commit.filesChanged > 0 && (
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                    {commit.filesChanged} file{commit.filesChanged !== 1 ? "s" : ""}
                  </span>
                )}
              </summary>

              <div style={{
                padding: "8px 16px 12px",
                fontSize: "11px",
                fontFamily: "monospace",
                color: "var(--text-muted)",
                display: "flex",
                gap: "16px",
                background: "var(--bg-secondary)",
              }}>
                <span>author: {commit.author}</span>
                <span>date: {commit.date.slice(0, 19).replace("T", " ")}</span>
                <span
                  data-copy-action={commit.hash}
                  data-copy-label={`full hash ${commit.shortHash}`}
                  style={{
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "0 4px",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                  }}
                >
                  [copy hash]
                </span>
              </div>
            </details>
          ))}
        </>
      )}
    </div>
  );
}
