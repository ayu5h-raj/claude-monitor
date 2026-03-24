import { getSessionDetail } from "@/lib/claude-data";
import type { FileChange } from "@/lib/types";

function countFileLines(file: FileChange): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  if (file.changeType === "created" && file.createdContent) {
    added += file.createdContent.split("\n").length;
  }
  for (const edit of file.edits) {
    added += edit.newString.split("\n").length;
    removed += edit.oldString.split("\n").length;
  }
  return { added, removed };
}

function DiffLine({ prefix, text, bg }: { prefix: string; text: string; bg: string }) {
  return (
    <div style={{ background: bg, padding: "0 8px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
      <span style={{ color: "var(--text-muted)", userSelect: "none", marginRight: "8px" }}>{prefix}</span>
      {text}
    </div>
  );
}

function FileDiff({ file }: { file: FileChange }) {
  const { added, removed } = countFileLines(file);
  const badgeColor =
    file.changeType === "created" ? "var(--green)" :
    file.changeType === "deleted" ? "var(--red)" : "var(--amber)";

  return (
    <details open={file.edits.length <= 3 && (!file.createdContent || file.createdContent.split("\n").length <= 50)}>
      <summary style={{
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{
          fontSize: "10px",
          padding: "1px 6px",
          borderRadius: "3px",
          background: `color-mix(in srgb, ${badgeColor} 15%, transparent)`,
          color: badgeColor,
          textTransform: "uppercase",
        }}>
          {file.changeType}
        </span>
        <span style={{ color: "var(--text-primary)", fontSize: "13px", flex: 1 }}>
          {file.filePath}
        </span>
        {added > 0 && <span style={{ color: "var(--green)", fontSize: "11px" }}>+{added}</span>}
        {removed > 0 && <span style={{ color: "var(--red)", fontSize: "11px" }}>-{removed}</span>}
      </summary>

      <div style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "1.5", overflow: "auto" }}>
        {file.changeType === "created" && file.createdContent && (
          <div>
            {file.createdContent.split("\n").map((line, i) => (
              <DiffLine key={i} prefix="+" text={line} bg="rgba(0, 255, 65, 0.06)" />
            ))}
          </div>
        )}

        {file.edits.map((edit, editIdx) => (
          <div key={editIdx}>
            {file.edits.length > 1 && (
              <div style={{
                padding: "4px 12px",
                color: "var(--text-muted)",
                fontSize: "11px",
                background: "rgba(0, 170, 255, 0.06)",
              }}>
                @@ edit {editIdx + 1} of {file.edits.length} @@
              </div>
            )}
            {edit.oldString.split("\n").map((line, i) => (
              <DiffLine key={`old-${i}`} prefix="-" text={line} bg="rgba(255, 68, 68, 0.08)" />
            ))}
            {edit.newString.split("\n").map((line, i) => (
              <DiffLine key={`new-${i}`} prefix="+" text={line} bg="rgba(0, 255, 65, 0.06)" />
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

export default async function AsyncDiffViewer({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) return <div style={{ padding: "20px", color: "var(--text-muted)" }}>Session not found</div>;

  const { codeImpact } = result;
  const { allFiles, filesCreated, filesModified, linesAdded, linesRemoved, impactScore } = codeImpact;

  if (allFiles.length === 0) {
    return (
      <div style={{
        padding: "40px 20px",
        color: "var(--text-muted)",
        textAlign: "center",
        fontFamily: "monospace",
        fontSize: "13px",
      }}>
        No file changes detected in this session.
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      {/* Summary header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        gap: "16px",
        alignItems: "center",
        fontSize: "12px",
        fontFamily: "monospace",
      }}>
        <span style={{ color: "var(--text-primary)" }}>
          {allFiles.length} file{allFiles.length !== 1 ? "s" : ""} changed
        </span>
        {filesCreated > 0 && (
          <span style={{ color: "var(--green)" }}>{filesCreated} created</span>
        )}
        {filesModified > 0 && (
          <span style={{ color: "var(--amber)" }}>{filesModified} modified</span>
        )}
        <span style={{ color: "var(--green)" }}>+{linesAdded}</span>
        <span style={{ color: "var(--red)" }}>-{linesRemoved}</span>
        <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
          impact: {impactScore}
        </span>
      </div>

      {/* File diffs */}
      {allFiles.map((file) => (
        <div key={file.filePath} style={{ borderBottom: "1px solid var(--border)" }}>
          <FileDiff file={file} />
        </div>
      ))}
    </div>
  );
}
