import type { DailyActivity } from "@/lib/types";

interface ContributionHeatmapProps {
  dailyActivity: DailyActivity[];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const INTENSITY_COLORS = [
  "#161b22",  // level 0: no activity
  "#003d14",  // level 1: low
  "#007a28",  // level 2: medium-low
  "#00bb3c",  // level 3: medium-high
  "#00ff41",  // level 4: high (var(--green))
];

const CELL_GAP = 3;
const LEGEND_SIZE = 11;

function padNum(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())}`;
}

function getLevel(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface CellData {
  dateStr: string;
  count: number;
  sessions: number;
  messages: number;
  tools: number;
  month: number;
}

export default function ContributionHeatmap({
  dailyActivity,
}: ContributionHeatmapProps) {
  // Build activity lookup
  const activityLookup = new Map<string, DailyActivity>();
  for (const day of dailyActivity) {
    activityLookup.set(day.date, day);
  }

  // Date range: last ~52 weeks ending today, aligned to start on Sunday
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 52 * 7 - today.getDay());

  // Build weeks (each is 7 cells: Sun..Sat)
  const weeks: (CellData | null)[][] = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const week: (CellData | null)[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (cursor > today) {
        week.push(null);
      } else {
        const dateStr = toDateStr(cursor);
        const activity = activityLookup.get(dateStr);
        week.push({
          dateStr,
          count: activity
            ? activity.sessionCount + activity.messageCount + activity.toolCallCount
            : 0,
          sessions: activity?.sessionCount ?? 0,
          messages: activity?.messageCount ?? 0,
          tools: activity?.toolCallCount ?? 0,
          month: cursor.getMonth(),
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const numWeeks = weeks.length;

  // Intensity scale
  const maxCount = Math.max(
    ...dailyActivity.map(
      (d) => d.sessionCount + d.messageCount + d.toolCallCount
    ),
    1
  );

  // Total activities shown
  const dateSet = new Set(
    weeks
      .flat()
      .filter((c): c is CellData => c !== null)
      .map((c) => c.dateStr)
  );
  let displayedActivities = 0;
  for (const day of dailyActivity) {
    if (dateSet.has(day.date)) {
      displayedActivities +=
        day.sessionCount + day.messageCount + day.toolCallCount;
    }
  }

  // Month labels with positions (as ratios for percentage-based placement)
  const allLabels: { name: string; weekIndex: number }[] = [];
  let prevMonth = -1;
  for (let wi = 0; wi < numWeeks; wi++) {
    const first = weeks[wi].find((c) => c !== null);
    if (first && first.month !== prevMonth) {
      allLabels.push({ name: MONTHS[first.month], weekIndex: wi });
      prevMonth = first.month;
    }
  }
  // Drop labels too close to the next one (< 3 weeks apart)
  const monthLabels = allLabels.filter((label, i) => {
    if (i === allLabels.length - 1) return true;
    return allLabels[i + 1].weekIndex - label.weekIndex >= 3;
  });

  const DAY_LABEL_WIDTH = 26;
  const FLEX_GAP = 4;

  return (
    <div
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-primary)",
          marginBottom: "12px",
          fontWeight: "bold",
        }}
      >
        {displayedActivities} activities in the last year
      </div>

      {/* Heatmap */}
      <div style={{ overflow: "visible" }}>
        {/* Month labels — positioned using percentages to match 1fr grid columns */}
        <div
          style={{
            position: "relative",
            height: "16px",
            marginLeft: `${DAY_LABEL_WIDTH + FLEX_GAP}px`,
            fontSize: "9px",
            color: "var(--text-muted)",
          }}
        >
          {monthLabels.map((label, i) => {
            const ratio = label.weekIndex / numWeeks;
            return (
              <span
                key={`${label.name}-${i}`}
                style={{
                  position: "absolute",
                  left: `calc(${ratio * 100}% + ${ratio * CELL_GAP}px)`,
                }}
              >
                {label.name}
              </span>
            );
          })}
        </div>

        {/* Day labels + cell grid */}
        <div style={{ display: "flex", gap: `${FLEX_GAP}px` }}>
          {/* Day-of-week labels */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: "repeat(7, 1fr)",
              gap: `${CELL_GAP}px`,
              fontSize: "9px",
              color: "var(--text-muted)",
              width: `${DAY_LABEL_WIDTH}px`,
              flexShrink: 0,
            }}
          >
            <span />
            <span style={{ display: "flex", alignItems: "center" }}>Mon</span>
            <span />
            <span style={{ display: "flex", alignItems: "center" }}>Wed</span>
            <span />
            <span style={{ display: "flex", alignItems: "center" }}>Fri</span>
            <span />
          </div>

          {/* Cell grid — 1fr columns fill available width, aspect-ratio keeps cells square */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: "repeat(7, auto)",
              gridAutoFlow: "column",
              gridAutoColumns: "1fr",
              gap: `${CELL_GAP}px`,
              flex: 1,
            }}
          >
            {weeks.map((week, wi) =>
              week.map((cell, di) => {
                if (!cell) {
                  return (
                    <div
                      key={`${wi}-${di}`}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "2px",
                      }}
                    />
                  );
                }
                const level = getLevel(cell.count, maxCount);
                const isLeftHalf = wi < numWeeks / 2;
                return (
                  <div
                    key={cell.dateStr}
                    className={isLeftHalf ? "heatmap-cell heatmap-cell-left" : "heatmap-cell"}
                    data-tooltip={`${cell.dateStr} — ${cell.sessions} sessions · ${cell.messages} msgs · ${cell.tools} tools`}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "2px",
                      backgroundColor: INTENSITY_COLORS[level],
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "4px",
          marginTop: "8px",
          fontSize: "9px",
          color: "var(--text-muted)",
        }}
      >
        <span>Less</span>
        {INTENSITY_COLORS.map((color, i) => (
          <span
            key={i}
            style={{
              width: LEGEND_SIZE,
              height: LEGEND_SIZE,
              borderRadius: "2px",
              backgroundColor: color,
              display: "inline-block",
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
