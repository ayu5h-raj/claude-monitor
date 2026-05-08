import type { TodoSummary } from "@/lib/todos";

const STATUS_GLYPH: Record<string, { icon: string; color: string }> = {
  completed: { icon: "[x]", color: "var(--green)" },
  in_progress: { icon: "[~]", color: "var(--amber)" },
  pending: { icon: "[ ]", color: "var(--text-muted)" },
};

export default function TodosPanel({ summary }: { summary: TodoSummary }) {
  if (summary.total === 0) return null;

  const pct = Math.round((summary.completed / summary.total) * 100);

  return (
    <details>
      <summary style={{ color: "var(--cyan)" }}>
        TODOS{" "}
        <span
          style={{
            color: "var(--text-muted)",
            fontWeight: "normal",
            fontSize: "10px",
          }}
        >
          {summary.completed}/{summary.total} done
          {summary.inProgress > 0 ? ` · ${summary.inProgress} in progress` : ""}
        </span>
      </summary>
      <div className="ide-sidebar-detail-content">
        <div
          style={{
            height: "4px",
            background: "var(--border)",
            borderRadius: "2px",
            overflow: "hidden",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "var(--green)",
              transition: "width 200ms",
            }}
          />
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {summary.todos.map((todo, i) => {
            const glyph = STATUS_GLYPH[todo.status] ?? STATUS_GLYPH.pending;
            const text =
              todo.status === "in_progress" && todo.hint ? todo.hint : todo.label;
            return (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  fontSize: "11px",
                  lineHeight: "1.4",
                }}
              >
                <span
                  style={{
                    color: glyph.color,
                    fontFamily: "monospace",
                    flexShrink: 0,
                    fontWeight: todo.status === "in_progress" ? "bold" : "normal",
                  }}
                >
                  {glyph.icon}
                </span>
                <span
                  style={{
                    color:
                      todo.status === "completed"
                        ? "var(--text-muted)"
                        : "var(--text-secondary)",
                    textDecoration:
                      todo.status === "completed" ? "line-through" : "none",
                  }}
                  title={todo.label !== text ? todo.label : undefined}
                >
                  {text}
                </span>
              </li>
            );
          })}
        </ul>
        {summary.source !== "TodoWrite" && (
          <div
            style={{
              fontSize: "9px",
              color: "var(--text-muted)",
              marginTop: "8px",
              fontStyle: "italic",
            }}
          >
            reconstructed from {summary.source} calls
          </div>
        )}
      </div>
    </details>
  );
}
