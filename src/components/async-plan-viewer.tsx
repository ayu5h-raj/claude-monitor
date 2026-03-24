import { getSessionDetail } from "@/lib/claude-data";
import { renderMessageContent } from "@/src/components/message-renderer";
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
          <div
            className="conv-entry-content"
            style={{ padding: "16px 20px" }}
            dangerouslySetInnerHTML={{ __html: renderMessageContent(plan.content) }}
          />
        </div>
      ))}
    </div>
  );
}
