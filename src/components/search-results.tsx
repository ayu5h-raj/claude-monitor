import Link from "next/link";
import type { SearchResult } from "@/lib/types";
import { formatRelativeTime } from "@/lib/path-utils";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

const matchTypeColors: Record<string, { bg: string; text: string; label: string }> = {
  user: { bg: "rgba(0,255,65,0.12)", text: "var(--green)", label: "USER" },
  assistant: { bg: "rgba(170,136,255,0.12)", text: "var(--purple)", label: "ASSISTANT" },
  tool_input: { bg: "rgba(255,170,0,0.12)", text: "var(--amber)", label: "TOOL" },
  tool_result: { bg: "rgba(255,170,0,0.12)", text: "var(--amber)", label: "RESULT" },
};

export default function SearchResults({ results, query }: SearchResultsProps) {
  // Deduplicate: show at most 3 matches per session
  const sessionCounts = new Map<string, number>();
  const filtered = results.filter((r) => {
    const count = sessionCounts.get(r.sessionId) || 0;
    if (count >= 3) return false;
    sessionCounts.set(r.sessionId, count + 1);
    return true;
  });

  const uniqueSessions = new Set(results.map((r) => r.sessionId)).size;

  return (
    <div>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--border-light)",
          fontSize: "12px",
          color: "var(--text-muted)",
          background: "var(--bg-secondary)",
        }}
      >
        {results.length} result{results.length !== 1 ? "s" : ""} across{" "}
        {uniqueSessions} session{uniqueSessions !== 1 ? "s" : ""} for &quot;
        <span style={{ color: "var(--green)" }}>{query}</span>&quot;
      </div>

      {filtered.map((result, i) => {
        const mc = matchTypeColors[result.matchType] || matchTypeColors.user;
        const lastActive = new Date(result.lastActiveAt);
        return (
          <Link
            key={`${result.sessionId}-${i}`}
            href={`/sessions/${result.sessionId}`}
            style={{
              display: "block",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-light)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span style={{ color: "var(--text-primary)", fontSize: "12px" }}>
                {result.project}
              </span>
              {result.branch && (
                <span style={{ color: "var(--green)", fontSize: "11px" }}>
                  {result.branch}
                </span>
              )}
              <span
                style={{
                  fontSize: "9px",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  background: mc.bg,
                  color: mc.text,
                  letterSpacing: "0.05em",
                  fontWeight: "bold",
                }}
              >
                {mc.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  color: "var(--text-muted)",
                  fontSize: "11px",
                }}
              >
                {formatRelativeTime(lastActive)}
              </span>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "60px",
                overflow: "hidden",
              }}
              dangerouslySetInnerHTML={{ __html: result.snippet }}
            />
          </Link>
        );
      })}
    </div>
  );
}
