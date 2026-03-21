import type { DailyActivity } from "@/lib/types";

interface ActivityChartProps {
  data: DailyActivity[];
  days?: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BAR_WIDTH = 20;

export default function ActivityChart({ data, days = 14 }: ActivityChartProps) {
  const recentData = data.slice(-days);

  const maxSessions = Math.max(...recentData.map((d) => d.sessionCount), 1);

  return (
    <div
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-secondary)",
          marginBottom: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Activity (last {days} days)
      </div>
      <div style={{ fontFamily: "monospace" }}>
        {recentData.map((day) => {
          const date = new Date(day.date + "T00:00:00");
          const weekday = WEEKDAYS[date.getDay()];
          const filled = Math.round((day.sessionCount / maxSessions) * BAR_WIDTH);
          const empty = BAR_WIDTH - filled;

          return (
            <div
              key={day.date}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "3px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  width: "28px",
                  flexShrink: 0,
                }}
              >
                {weekday}
              </span>
              <span>
                <span style={{ color: "var(--green)" }}>
                  {"▓".repeat(filled)}
                </span>
                <span style={{ color: "var(--border)" }}>
                  {"░".repeat(empty)}
                </span>
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                }}
              >
                {day.sessionCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
