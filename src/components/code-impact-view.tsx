import type { CodeImpact, FileChange } from "@/lib/types";

interface CodeImpactViewProps {
  impact: CodeImpact;
  repoPath: string;
}

function relativePath(filePath: string, repoPath: string): string {
  if (filePath.startsWith(repoPath)) {
    return filePath.slice(repoPath.length + 1);
  }
  return filePath;
}

function ChangeBadge({ type }: { type: FileChange["changeType"] }) {
  const colors: Record<string, { bg: string; text: string }> = {
    created: { bg: "rgba(0,255,65,0.15)", text: "var(--green)" },
    modified: { bg: "rgba(255,170,0,0.15)", text: "var(--amber)" },
    deleted: { bg: "rgba(255,68,68,0.15)", text: "var(--red)" },
  };
  const c = colors[type] || colors.modified;
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "1px 5px",
        borderRadius: "3px",
        background: c.bg,
        color: c.text,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        fontWeight: "bold",
      }}
    >
      {type}
    </span>
  );
}

function DiffBlock({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  return (
    <div style={{ fontSize: "11px", marginTop: "4px" }}>
      {oldStr && (
        <pre
          style={{
            margin: "0 0 2px",
            padding: "6px 8px",
            background: "rgba(255,68,68,0.08)",
            borderLeft: "2px solid var(--red)",
            borderRadius: "2px",
            overflow: "auto",
            maxHeight: "200px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: "var(--text-secondary)",
          }}
        >
          {oldStr}
        </pre>
      )}
      {newStr && (
        <pre
          style={{
            margin: 0,
            padding: "6px 8px",
            background: "rgba(0,255,65,0.06)",
            borderLeft: "2px solid var(--green)",
            borderRadius: "2px",
            overflow: "auto",
            maxHeight: "200px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: "var(--text-secondary)",
          }}
        >
          {newStr}
        </pre>
      )}
    </div>
  );
}

function FileRow({ file, repoPath }: { file: FileChange; repoPath: string }) {
  const rel = relativePath(file.filePath, repoPath);
  const fileName = rel.split("/").pop() || rel;
  const dirPath = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/") + 1) : "";

  return (
    <div style={{ marginBottom: "6px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 0",
        }}
      >
        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{dirPath}</span>
        <span style={{ color: "var(--text-primary)", fontSize: "12px" }}>{fileName}</span>
        <ChangeBadge type={file.changeType} />
        {file.edits.length > 0 && (
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
            {file.edits.length} edit{file.edits.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Created file content */}
      {file.changeType === "created" && file.createdContent && (
        <details style={{ marginLeft: "16px" }}>
          <summary
            style={{
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "11px",
              padding: "2px 0",
            }}
          >
            show content
          </summary>
          <pre
            style={{
              margin: "4px 0",
              padding: "6px 8px",
              background: "rgba(0,255,65,0.06)",
              borderLeft: "2px solid var(--green)",
              borderRadius: "2px",
              overflow: "auto",
              maxHeight: "300px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontSize: "11px",
              color: "var(--text-secondary)",
            }}
          >
            {file.createdContent}
          </pre>
        </details>
      )}

      {/* Edit diffs */}
      {file.edits.map((edit, i) => (
        <details key={i} style={{ marginLeft: "16px" }}>
          <summary
            style={{
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "11px",
              padding: "2px 0",
            }}
          >
            edit {i + 1}
          </summary>
          <DiffBlock oldStr={edit.oldString} newStr={edit.newString} />
        </details>
      ))}
    </div>
  );
}

export default function CodeImpactView({ impact, repoPath }: CodeImpactViewProps) {
  if (impact.filesCreated === 0 && impact.filesModified === 0 && impact.totalEdits === 0) {
    return null;
  }

  const summaryParts: string[] = [];
  if (impact.filesCreated > 0) summaryParts.push(`${impact.filesCreated} created`);
  if (impact.filesModified > 0) summaryParts.push(`${impact.filesModified} modified`);

  return (
    <details
      style={{
        marginBottom: "24px",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
      }}
    >
      <summary
        style={{
          padding: "12px",
          cursor: "pointer",
          color: "var(--purple)",
          fontSize: "11px",
          fontWeight: "bold",
          letterSpacing: "0.08em",
        }}
      >
        CODE IMPACT{" "}
        <span
          style={{
            fontSize: "10px",
            padding: "1px 6px",
            borderRadius: "3px",
            background: "rgba(170,136,255,0.15)",
            color: "var(--purple)",
          }}
        >
          score: {impact.impactScore}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          {summaryParts.join(", ")}
        </span>
        {(impact.linesAdded > 0 || impact.linesRemoved > 0) && (
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
            <span style={{ color: "var(--green)" }}>+{impact.linesAdded}</span>
            {" / "}
            <span style={{ color: "var(--red)" }}>-{impact.linesRemoved}</span>
          </span>
        )}
      </summary>

      <div style={{ display: "flex", flexDirection: "column", padding: "0 12px 12px" }}>
        {impact.allFiles.map((file) => (
          <FileRow key={file.filePath} file={file} repoPath={repoPath} />
        ))}
      </div>
    </details>
  );
}
