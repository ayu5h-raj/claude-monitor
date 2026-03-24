import { getSessionDetail } from "@/lib/claude-data";
import type { SessionEntry } from "@/lib/types";

interface PlanInfo {
  filePath: string;
  fileName: string;
  content: string;
}

function extractPlans(entries: SessionEntry[]): PlanInfo[] {
  const planMap = new Map<string, string>();

  for (const entry of entries) {
    if (entry.type !== "tool_use") continue;

    // Write tool calls to plan files
    if (entry.toolName === "Write" && entry.toolInput) {
      const filePath = entry.toolInput.file_path as string | undefined;
      const content = entry.toolInput.content as string | undefined;
      if (filePath && content && filePath.includes(".claude/plans/")) {
        planMap.set(filePath, content);
      }
    }

    // Edit tool calls to plan files — apply edits to existing content
    if (entry.toolName === "Edit" && entry.toolInput) {
      const filePath = entry.toolInput.file_path as string | undefined;
      const oldString = entry.toolInput.old_string as string | undefined;
      const newString = entry.toolInput.new_string as string | undefined;
      if (filePath && filePath.includes(".claude/plans/") && oldString !== undefined && newString !== undefined) {
        const existing = planMap.get(filePath) || "";
        if (existing.includes(oldString)) {
          planMap.set(filePath, existing.replace(oldString, newString));
        }
      }
    }
  }

  return Array.from(planMap.entries()).map(([filePath, content]) => ({
    filePath,
    fileName: filePath.split("/").pop() || filePath,
    content,
  }));
}

function PlanContent({ content }: { content: string }) {
  // Render markdown-like content with basic formatting
  const lines = content.split("\n");
  return (
    <div style={{ padding: "16px 20px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6" }}>
      {lines.map((line, i) => {
        // Headings
        if (line.startsWith("# ")) {
          return <div key={i} style={{ color: "var(--green)", fontSize: "16px", fontWeight: "bold", margin: "16px 0 8px" }}>{line.slice(2)}</div>;
        }
        if (line.startsWith("## ")) {
          return <div key={i} style={{ color: "var(--green)", fontSize: "14px", fontWeight: "bold", margin: "14px 0 6px" }}>{line.slice(3)}</div>;
        }
        if (line.startsWith("### ")) {
          return <div key={i} style={{ color: "var(--amber)", fontSize: "13px", fontWeight: "bold", margin: "12px 0 4px" }}>{line.slice(4)}</div>;
        }
        // Horizontal rule
        if (line.match(/^---+$/)) {
          return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />;
        }
        // List items
        if (line.match(/^[-*] /)) {
          return <div key={i} style={{ color: "var(--text-primary)", paddingLeft: "16px" }}>{line}</div>;
        }
        // Numbered list
        if (line.match(/^\d+\. /)) {
          return <div key={i} style={{ color: "var(--text-primary)", paddingLeft: "16px" }}>{line}</div>;
        }
        // Code blocks
        if (line.startsWith("```")) {
          return <div key={i} style={{ color: "var(--text-muted)", fontSize: "11px" }}>{line}</div>;
        }
        // Bold text in table-like rows
        if (line.startsWith("|")) {
          return <div key={i} style={{ color: "var(--text-secondary)", whiteSpace: "pre" }}>{line}</div>;
        }
        // Empty lines
        if (line.trim() === "") {
          return <div key={i} style={{ height: "8px" }} />;
        }
        // Regular text
        return <div key={i} style={{ color: "var(--text-primary)" }}>{line}</div>;
      })}
    </div>
  );
}

export default async function AsyncPlanViewer({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) return <div style={{ padding: "20px", color: "var(--text-muted)" }}>Session not found</div>;

  const { entries } = result;
  const plans = extractPlans(entries);

  if (plans.length === 0) {
    return (
      <div style={{
        padding: "40px 20px",
        color: "var(--text-muted)",
        textAlign: "center",
        fontFamily: "monospace",
        fontSize: "13px",
      }}>
        <div>No plan was created during this session.</div>
        <div style={{ fontSize: "11px", marginTop: "8px" }}>
          Plans are detected from Write/Edit tool calls targeting ~/.claude/plans/ files.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      {plans.map((plan) => (
        <div key={plan.filePath}>
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: "12px",
            fontFamily: "monospace",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: "rgba(0, 170, 255, 0.15)",
              color: "var(--blue, #00aaff)",
            }}>
              PLAN
            </span>
            <span style={{ color: "var(--text-primary)" }}>{plan.fileName}</span>
            <span
              data-copy-action={plan.content}
              data-copy-label={`plan ${plan.fileName}`}
              style={{
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: "11px",
                padding: "0 4px",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                marginLeft: "auto",
              }}
            >
              [copy plan]
            </span>
          </div>
          <PlanContent content={plan.content} />
        </div>
      ))}
    </div>
  );
}
