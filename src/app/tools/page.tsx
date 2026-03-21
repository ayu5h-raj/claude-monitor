export const dynamic = "force-dynamic";

import Link from "next/link";
import { getToolAnalytics } from "@/lib/claude-data";

export default async function ToolsPage() {
  const { tools, recentErrors } = await getToolAnalytics();

  const totalCalls = tools.reduce((sum, t) => sum + t.totalCalls, 0);
  const totalErrors = tools.reduce((sum, t) => sum + t.totalErrors, 0);
  const maxCalls = tools[0]?.totalCalls || 1;

  return (
    <div style={{ padding: "16px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header stats */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          marginBottom: "24px",
          fontSize: "12px",
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)" }}>total calls </span>
          <span style={{ color: "var(--blue)" }}>{totalCalls.toLocaleString()}</span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>total errors </span>
          <span style={{ color: totalErrors > 0 ? "var(--red)" : "var(--green)" }}>
            {totalErrors}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>unique tools </span>
          <span style={{ color: "var(--text-secondary)" }}>{tools.length}</span>
        </div>
      </div>

      {/* Tool usage table */}
      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Tool Usage
        </div>

        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr 80px 70px 70px",
            gap: "12px",
            padding: "8px 16px",
            borderBottom: "1px solid var(--border-light)",
            color: "var(--text-muted)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span>tool</span>
          <span>usage</span>
          <span style={{ textAlign: "right" }}>calls</span>
          <span style={{ textAlign: "right" }}>errors</span>
          <span style={{ textAlign: "right" }}>error %</span>
        </div>

        {/* Tool rows */}
        {tools.map((tool) => {
          const barWidth = Math.max(1, (tool.totalCalls / maxCalls) * 100);
          const hasErrors = tool.totalErrors > 0;
          const highErrorRate = tool.errorRate > 5;

          return (
            <div
              key={tool.name}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr 80px 70px 70px",
                gap: "12px",
                padding: "8px 16px",
                borderBottom: "1px solid var(--border-light)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tool.name}
              </span>
              <div
                style={{
                  background: "var(--border)",
                  height: "6px",
                  borderRadius: "3px",
                }}
              >
                <div
                  style={{
                    background: hasErrors ? "var(--amber)" : "var(--blue)",
                    height: "100%",
                    width: `${barWidth}%`,
                    borderRadius: "3px",
                  }}
                />
              </div>
              <span
                style={{
                  color: "var(--blue)",
                  fontSize: "12px",
                  textAlign: "right",
                }}
              >
                {tool.totalCalls.toLocaleString()}
              </span>
              <span
                style={{
                  color: hasErrors ? "var(--red)" : "var(--text-muted)",
                  fontSize: "12px",
                  textAlign: "right",
                }}
              >
                {tool.totalErrors}
              </span>
              <span
                style={{
                  color: highErrorRate
                    ? "var(--red)"
                    : hasErrors
                      ? "var(--amber)"
                      : "var(--text-muted)",
                  fontSize: "12px",
                  textAlign: "right",
                }}
              >
                {tool.errorRate.toFixed(1)}%
              </span>
            </div>
          );
        })}

        {tools.length === 0 && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            no tool usage data found
          </div>
        )}
      </div>

      {/* Recent errors */}
      {recentErrors.length > 0 && (
        <div
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              color: "var(--red)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Recent Errors ({recentErrors.length})
          </div>

          {recentErrors.map((err, i) => (
            <Link
              key={`${err.sessionId}-${err.toolName}-${i}`}
              href={`/sessions/${err.sessionId}`}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 100px",
                gap: "12px",
                padding: "8px 16px",
                borderBottom: "1px solid var(--border-light)",
                textDecoration: "none",
                color: "inherit",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "var(--amber)" }}>{err.toolName}</span>
              <span style={{ color: "var(--text-secondary)" }}>{err.project}</span>
              <span style={{ color: "var(--text-muted)", textAlign: "right" }}>
                {err.lastActiveAt.slice(0, 10)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
