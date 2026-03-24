import { getSessionDetail } from "@/lib/claude-data";
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

export default async function AsyncPRLinks({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) return <div style={{ padding: "20px", color: "var(--text-muted)" }}>Session not found</div>;

  const { entries } = result;
  const prUrls = extractPRs(entries);

  if (prUrls.length === 0) {
    return (
      <div style={{
        padding: "40px 20px",
        color: "var(--text-muted)",
        textAlign: "center",
        fontFamily: "monospace",
        fontSize: "13px",
      }}>
        <div>No pull requests detected in this session.</div>
        <div style={{ fontSize: "11px", marginTop: "8px" }}>
          PRs are extracted from conversation and tool results by matching GitHub PR URLs.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
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
          color: "#aa88ff",
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
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
              fontFamily: "monospace",
            }}
          >
            <span style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: "rgba(170, 136, 255, 0.15)",
              color: "#aa88ff",
            }}>
              PR
            </span>
            <span style={{ color: "#aa88ff", fontWeight: "bold" }}>#{pr.number}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{pr.repo}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--blue, #00aaff)",
                fontSize: "12px",
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
                padding: "1px 6px",
                border: "1px solid var(--border)",
                borderRadius: "3px",
              }}
            >
              [copy url]
            </span>
          </div>
        );
      })}
    </div>
  );
}
