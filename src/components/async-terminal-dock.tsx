import { getSessionDetail } from "@/lib/claude-data";
import Terminal from "@/src/components/terminal";

export default async function AsyncTerminalDock({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) return null;
  const { session } = result;

  return (
    <details className="ide-dock" suppressHydrationWarning>
      <summary>
        <span className="ide-dock-label">TERMINAL</span>
        <span
          id="terminal-status-dot"
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--text-muted)",
          }}
        />
        <span className="ide-dock-hint">
          claude --resume {session.id.slice(0, 8)}
        </span>
      </summary>
      <div id="ide-dock-drag" className="ide-dock-drag" />
      <div id="ide-dock-content" className="ide-dock-content">
        <Terminal sessionId={session.id} cwd={session.projectPath} />
      </div>
    </details>
  );
}
