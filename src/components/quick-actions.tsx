interface QuickActionsProps {
  sessionId: string;
  projectPath: string;
  project: string;
  branch: string;
  duration: string;
  filesChanged: number;
  tokenCount: string;
  firstMessage?: string;
}

export function QuickActions({
  sessionId,
  projectPath,
  project,
  branch,
  duration,
  filesChanged,
  tokenCount,
  firstMessage,
}: QuickActionsProps) {
  const shortId = sessionId.slice(0, 8);
  const resumeCmd = `claude --resume ${sessionId}`;
  const cdCmd = `cd "${projectPath}"`;
  const codeCmd = `code "${projectPath}"`;
  const summary = [
    `Session: ${shortId}`,
    `Project: ${project}`,
    `Branch: ${branch}`,
    `Duration: ${duration}`,
    `Files changed: ${filesChanged}`,
    `Tokens: ${tokenCount}`,
    firstMessage ? `---\n${firstMessage.slice(0, 200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const buttonStyle: React.CSSProperties = {
    background: "#111",
    color: "#888",
    border: "1px solid #333",
    padding: "4px 10px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "11px",
    borderRadius: "3px",
  };

  return (
    <div id="quick-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
      <button type="button" style={buttonStyle} data-copy-action={resumeCmd} data-copy-label="resume command">
        [Resume]
      </button>
      <button type="button" style={buttonStyle} data-copy-action={cdCmd} data-copy-label="cd command">
        [Terminal]
      </button>
      <button type="button" style={buttonStyle} data-copy-action={codeCmd} data-copy-label="code command">
        [VS Code]
      </button>
      <button type="button" style={buttonStyle} data-copy-action={summary} data-copy-label="session summary">
        [Summary]
      </button>
      <a
        href={`/api/export/${sessionId}`}
        style={{
          ...buttonStyle,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        [Export]
      </a>
    </div>
  );
}
