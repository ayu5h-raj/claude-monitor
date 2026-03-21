export const dynamic = "force-dynamic";

import { getStats, getAllSessions } from "@/lib/claude-data";
import { formatTokenCount, formatDuration } from "@/lib/path-utils";
import StatCard from "@/components/stat-card";
import ContributionHeatmap from "@/components/contribution-heatmap";
import ModelBreakdown from "@/components/model-breakdown";

export default async function StatsPage() {
  const [stats, sessions] = await Promise.all([getStats(), getAllSessions()]);

  if (!stats) {
    return (
      <div
        style={{
          padding: "32px",
          color: "var(--text-muted)",
          fontSize: "13px",
        }}
      >
        No stats available. Start using Claude Code to generate usage data.
      </div>
    );
  }

  // Compute derived stats
  const totalTokens = Object.values(stats.modelUsage).reduce(
    (sum, m) => sum + m.inputTokens + m.outputTokens,
    0
  );

  const totalToolCalls = sessions.reduce(
    (sum, s) => sum + s.toolCallCount,
    0
  );

  const avgToolsPerSession =
    sessions.length > 0
      ? Math.round(totalToolCalls / sessions.length)
      : 0;

  const sessionDurations = sessions
    .map((s) => s.lastActiveAt.getTime() - s.startedAt.getTime())
    .filter((d) => d > 0);

  const avgDuration =
    sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

  const maxDuration =
    sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekSessions = sessions.filter(
    (s) => s.lastActiveAt.getTime() >= oneWeekAgo
  ).length;

  const estimatedCost = totalTokens * 0.000003;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            color: "var(--text-primary)",
            margin: "0 0 4px 0",
          }}
        >
          Usage Stats
        </h1>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {thisWeekSessions} sessions this week
          {stats.firstSessionDate
            ? ` · since ${stats.firstSessionDate}`
            : ""}
        </div>
      </div>

      {/* 4-column stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <StatCard
          label="Total Sessions"
          value={String(stats.totalSessions)}
          subtitle={`${thisWeekSessions} this week`}
          color="var(--green)"
        />
        <StatCard
          label="Tokens Used"
          value={formatTokenCount(totalTokens)}
          subtitle={`~$${estimatedCost.toFixed(2)} est.`}
          color="var(--amber)"
        />
        <StatCard
          label="Tool Calls"
          value={String(totalToolCalls)}
          subtitle={`${avgToolsPerSession} avg/session`}
          color="var(--blue)"
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(avgDuration)}
          subtitle={maxDuration > 0 ? `max ${formatDuration(maxDuration)}` : undefined}
          color="var(--text-primary)"
        />
      </div>

      {/* Full-width contribution heatmap */}
      <div style={{ marginBottom: "12px" }}>
        <ContributionHeatmap dailyActivity={stats.dailyActivity} />
      </div>

      {/* Full-width model breakdown */}
      <ModelBreakdown modelUsage={stats.modelUsage} />
    </div>
  );
}
