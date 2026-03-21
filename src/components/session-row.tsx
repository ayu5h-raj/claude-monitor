import Link from "next/link";
import { formatTokenCount } from "@/lib/path-utils";

interface SessionRowProps {
  session: {
    id: string;
    project: string;
    branch: string;
    status: "active" | "completed";
    lastActiveAt: string;
    toolCallCount: number;
    tokenUsage: { input: number; output: number; cacheRead: number; cacheCreation: number };
    filesChanged: string[];
  };
}

function getRelativeTime(isoStr: string): string {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export default function SessionRow({ session }: SessionRowProps) {
  const totalTokens =
    session.tokenUsage.input +
    session.tokenUsage.output +
    session.tokenUsage.cacheRead +
    session.tokenUsage.cacheCreation;

  return (
    <Link
      href={`/sessions/${session.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr 140px 80px 60px 50px 80px",
        alignItems: "center",
        gap: "0 12px",
        padding: "8px 16px",
        borderBottom: "1px solid var(--border-light)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background:
            session.status === "active"
              ? "var(--green)"
              : "var(--text-muted)",
          boxShadow:
            session.status === "active"
              ? "0 0 4px var(--green)"
              : "none",
        }}
      />
      <span
        style={{
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {session.project}
      </span>
      <span
        style={{
          color: "var(--text-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "12px",
        }}
      >
        {session.branch}
      </span>
      <span style={{ color: "var(--amber)", textAlign: "right", fontSize: "12px" }}>
        {formatTokenCount(totalTokens)}
      </span>
      <span style={{ color: "var(--blue)", textAlign: "right", fontSize: "12px" }}>
        {session.toolCallCount}
      </span>
      <span style={{ color: "var(--purple)", textAlign: "right", fontSize: "12px" }}>
        {session.filesChanged.length || "—"}
      </span>
      <span style={{ color: "var(--text-muted)", textAlign: "right", fontSize: "12px" }}>
        {getRelativeTime(session.lastActiveAt)}
      </span>
    </Link>
  );
}
