import { getSessionDetail } from "@/lib/claude-data";
import { computeSessionAnalytics } from "@/lib/session-analytics";
import SessionAnalyticsView from "@/src/components/session-analytics";

export default async function AsyncAnalytics({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: "13px" }}>Session not found.</div>
      </div>
    );
  }

  const { session, entries, codeImpact } = result;

  const analytics = computeSessionAnalytics({
    entries,
    toolStats: session.toolStats,
    tokenUsage: session.tokenUsage,
    startedAt: session.startedAt,
    lastActiveAt: session.lastActiveAt,
    messageCount: session.messageCount,
    toolCallCount: session.toolCallCount,
    model: session.model,
    filesCreated: codeImpact.filesCreated,
    filesModified: codeImpact.filesModified,
    filesDeleted: codeImpact.filesDeleted,
  });

  return <SessionAnalyticsView analytics={analytics} />;
}
