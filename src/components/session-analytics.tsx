import type { SessionAnalytics, ToolBreakdownItem } from "@/lib/session-analytics";
import { formatTokenCount, formatDuration } from "@/lib/path-utils";

const cardStyle: React.CSSProperties = {
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "16px",
};

const cardHeader: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-secondary)",
  marginBottom: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const subRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  marginBottom: "6px",
};

function formatUSD(amount: number): string {
  if (amount < 0.01) return `<$0.01`;
  if (amount < 1) return `$${amount.toFixed(2)}`;
  if (amount < 100) return `$${amount.toFixed(2)}`;
  return `$${amount.toFixed(0)}`;
}

function colorForTool(name: string): string {
  if (name.startsWith("mcp__")) return "var(--cyan)";
  if (name === "Agent") return "var(--purple)";
  if (name === "Skill") return "var(--purple)";
  if (name === "Bash") return "var(--green)";
  if (name === "Edit" || name === "Write") return "var(--amber)";
  if (name === "Read" || name === "Grep" || name === "Glob") return "var(--blue)";
  if (name.startsWith("Task") || name === "TodoWrite") return "var(--cyan)";
  return "var(--text-secondary)";
}

function TokenCard({ a }: { a: SessionAnalytics }) {
  const totalIn =
    a.tokenUsage.input + a.tokenUsage.cacheRead + a.tokenUsage.cacheCreation;
  return (
    <div style={cardStyle}>
      <div style={cardHeader}>Token Usage</div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "var(--amber)",
          marginBottom: "4px",
        }}
      >
        {formatTokenCount(a.totalTokens)}
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "12px" }}>
        total tokens
        {a.estimatedCostUSD !== undefined && (
          <> · est. cost <span style={{ color: "var(--green)" }}>{formatUSD(a.estimatedCostUSD)}</span></>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "10px" }}>
        <div style={subRow}>
          <span style={{ color: "var(--text-muted)" }}>input (fresh)</span>
          <span style={{ color: "var(--text-secondary)" }}>{formatTokenCount(a.tokenUsage.input)}</span>
        </div>
        <div style={subRow}>
          <span style={{ color: "var(--text-muted)" }}>cache read</span>
          <span style={{ color: "var(--green)" }}>{formatTokenCount(a.tokenUsage.cacheRead)}</span>
        </div>
        <div style={subRow}>
          <span style={{ color: "var(--text-muted)" }}>cache creation</span>
          <span style={{ color: "var(--text-secondary)" }}>{formatTokenCount(a.tokenUsage.cacheCreation)}</span>
        </div>
        <div style={subRow}>
          <span style={{ color: "var(--text-muted)" }}>output</span>
          <span style={{ color: "var(--text-secondary)" }}>{formatTokenCount(a.tokenUsage.output)}</span>
        </div>
        <div style={{ ...subRow, marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-light)" }}>
          <span style={{ color: "var(--text-muted)" }}>cache hit %</span>
          <span style={{ color: "var(--green)" }}>{a.cacheHitPercent}%</span>
        </div>
        <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden", marginTop: "4px" }}>
          <div style={{ height: "100%", width: `${a.cacheHitPercent}%`, background: "var(--green)" }} />
        </div>
        {totalIn > 0 && (
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px" }}>
            of {formatTokenCount(totalIn)} input tokens, {formatTokenCount(a.tokenUsage.cacheRead)} were served from cache
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBreakdownCard({ tools, totalCalls, totalErrors }: { tools: ToolBreakdownItem[]; totalCalls: number; totalErrors: number }) {
  const top = tools.slice(0, 12);
  const remaining = tools.length - top.length;
  const max = top[0]?.calls ?? 0;
  return (
    <div style={cardStyle}>
      <div style={{ ...cardHeader, display: "flex", justifyContent: "space-between" }}>
        <span>Tool Calls</span>
        <span style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>
          {totalCalls} calls · {totalErrors} errors
        </span>
      </div>
      {tools.length === 0 && (
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>No tool usage recorded.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {top.map((t) => {
          const pct = max > 0 ? Math.round((t.calls / max) * 100) : 0;
          const errorPct = t.calls > 0 ? Math.round((t.errors / t.calls) * 100) : 0;
          return (
            <div key={t.name}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "70%",
                  }}
                  title={t.name}
                >
                  {t.isMcp && t.mcpServer ? (
                    <>
                      <span style={{ color: "var(--cyan)" }}>mcp:</span>
                      {t.mcpServer}
                      <span style={{ color: "var(--text-muted)" }}> · {t.name.split("__").slice(2).join("__")}</span>
                    </>
                  ) : (
                    t.name
                  )}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {t.calls}
                  {t.errors > 0 && (
                    <span style={{ color: "var(--red)" }}> · {t.errors} err ({errorPct}%)</span>
                  )}
                </span>
              </div>
              <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: colorForTool(t.name) }} />
              </div>
            </div>
          );
        })}
        {remaining > 0 && (
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
            +{remaining} more tools
          </div>
        )}
      </div>
    </div>
  );
}

function FilesCard({ a }: { a: SessionAnalytics }) {
  const total = a.filesCreated + a.filesModified + a.filesDeleted;
  return (
    <div style={cardStyle}>
      <div style={cardHeader}>Files Touched</div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: total > 0 ? "var(--green)" : "var(--text-muted)",
          marginBottom: "12px",
        }}
      >
        {total}
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>created</span>
        <span style={{ color: "var(--green)" }}>+{a.filesCreated}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>modified</span>
        <span style={{ color: "var(--amber)" }}>~{a.filesModified}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>deleted</span>
        <span style={{ color: "var(--red)" }}>-{a.filesDeleted}</span>
      </div>
    </div>
  );
}

function TimingCard({ a }: { a: SessionAnalytics }) {
  const startedTime = a.startedAt.slice(11, 16);
  const startedDate = a.startedAt.slice(0, 10);
  const lastTime = a.lastActiveAt.slice(11, 16);
  const lastDate = a.lastActiveAt.slice(0, 10);
  return (
    <div style={cardStyle}>
      <div style={cardHeader}>Session Timing</div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "var(--blue)",
          marginBottom: "4px",
        }}
      >
        {formatDuration(a.durationMs)}
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "12px" }}>
        wall clock
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>started</span>
        <span style={{ color: "var(--text-secondary)" }}>{startedDate} {startedTime}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>last active</span>
        <span style={{ color: "var(--text-secondary)" }}>{lastDate} {lastTime}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>longest gap</span>
        <span style={{ color: "var(--amber)" }}>{a.longestGapMs > 0 ? formatDuration(a.longestGapMs) : "—"}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>messages</span>
        <span style={{ color: "var(--text-secondary)" }}>{a.messageCount}</span>
      </div>
    </div>
  );
}

function SubagentsCard({ a }: { a: SessionAnalytics }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeader}>Agents &amp; Skills</div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: a.subagentCount > 0 ? "var(--purple)" : "var(--text-muted)",
          marginBottom: "12px",
        }}
      >
        {a.subagentCount}
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "12px" }}>
        subagent{a.subagentCount === 1 ? "" : "s"} dispatched
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>skills invoked</span>
        <span style={{ color: "var(--purple)" }}>{a.skillCount}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>TaskCreate</span>
        <span style={{ color: "var(--cyan)" }}>{a.taskCreateCount}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>TaskUpdate</span>
        <span style={{ color: "var(--cyan)" }}>{a.taskUpdateCount}</span>
      </div>
      <div style={subRow}>
        <span style={{ color: "var(--text-muted)" }}>TodoWrite</span>
        <span style={{ color: "var(--cyan)" }}>{a.todoWriteCount}</span>
      </div>
    </div>
  );
}

function ActivityCard({ a }: { a: SessionAnalytics }) {
  const points = a.activity;
  if (points.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={cardHeader}>Activity Timeline</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          No assistant turns with usage recorded.
        </div>
      </div>
    );
  }

  const width = 600;
  const height = 120;
  const padX = 4;
  const padY = 12;
  const avail = height - padY * 2;
  const maxTotal = Math.max(
    ...points.map((p) => p.inputTokens + p.outputTokens),
    1,
  );
  const barW = Math.max(1, (width - padX * 2) / points.length - 1);

  return (
    <div style={cardStyle}>
      <div style={{ ...cardHeader, display: "flex", justifyContent: "space-between" }}>
        <span>Activity Timeline</span>
        <span style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>
          {points.length} assistant turn{points.length === 1 ? "" : "s"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "120px", display: "block" }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Per-turn token usage across ${points.length} turns`}
      >
        {points.map((p, i) => {
          const x = padX + i * (barW + 1);
          const inH = (avail * p.inputTokens) / maxTotal;
          const outH = (avail * p.outputTokens) / maxTotal;
          const yIn = height - padY - inH;
          const yOut = yIn - outH;
          return (
            <g key={i}>
              <title>
                {`turn ${p.index + 1} · in ${p.inputTokens.toLocaleString()} · out ${p.outputTokens.toLocaleString()}`}
              </title>
              <rect x={x} y={yOut} width={barW} height={Math.max(0, outH)} fill="var(--amber)" />
              <rect x={x} y={yIn} width={barW} height={Math.max(0, inH)} fill="var(--blue)" />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: "16px", fontSize: "10px", color: "var(--text-muted)", marginTop: "8px" }}>
        <span><span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--blue)", marginRight: "4px" }} />input</span>
        <span><span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--amber)", marginRight: "4px" }} />output</span>
      </div>
    </div>
  );
}

export default function SessionAnalyticsView({ analytics }: { analytics: SessionAnalytics }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "12px",
        height: "100%",
        overflow: "auto",
        alignContent: "start",
      }}
    >
      <TokenCard a={analytics} />
      <FilesCard a={analytics} />
      <TimingCard a={analytics} />
      <SubagentsCard a={analytics} />
      <div style={{ gridColumn: "1 / -1" }}>
        <ToolBreakdownCard
          tools={analytics.toolBreakdown}
          totalCalls={analytics.totalToolCalls}
          totalErrors={analytics.totalToolErrors}
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <ActivityCard a={analytics} />
      </div>
    </div>
  );
}
