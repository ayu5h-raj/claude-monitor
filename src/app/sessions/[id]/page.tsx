import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionDetail } from "@/lib/claude-data";
import { getSessionMetadata } from "@/lib/session-metadata";
import ConversationEntry from "@/src/components/conversation-entry";
import { BookmarkButton } from "@/src/components/bookmark-button";
import { TagPills } from "@/src/components/tag-pills";
import { SessionNotes } from "@/src/components/session-notes";
import { QuickActions } from "@/src/components/quick-actions";
import { addTagAction } from "@/src/app/actions/metadata";
import { formatTokenCount, formatDuration } from "@/lib/path-utils";
import { getGlobalConfig, getProjectConfig } from "@/lib/config-data";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const result = await getSessionDetail(id);
  if (!result) notFound();
  const { session, entries } = result;
  const metadata = await getSessionMetadata(session.id);
  const [globalConfig, projectConfig] = await Promise.all([
    getGlobalConfig(),
    getProjectConfig(session.projectPath),
  ]);

  const totalPlugins = globalConfig.plugins.length;
  const totalSkills =
    globalConfig.skills.length +
    globalConfig.plugins.reduce((sum, p) => sum + p.skills.length, 0);
  const totalMcpServers =
    globalConfig.mcpServers.length + projectConfig.mcpServers.length;
  const returnUrl = `/sessions/${session.id}`;

  const totalTokens =
    session.tokenUsage.input +
    session.tokenUsage.output +
    session.tokenUsage.cacheRead +
    session.tokenUsage.cacheCreation;

  const durationMs =
    session.lastActiveAt.getTime() - session.startedAt.getTime();
  const durationStr = formatDuration(durationMs);

  const startedIso = session.startedAt.toISOString();
  const startedDate = startedIso.slice(0, 10); // "YYYY-MM-DD"
  const startedTime = startedIso.slice(11, 16); // "HH:MM"

  const serializedEntries = entries.map((e) => ({
    ...e,
    timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
  })).reverse(); // Latest first

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "12px",
          }}
        >
          ← back
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <BookmarkButton
            sessionId={session.id}
            bookmarked={metadata?.bookmarked || false}
            returnUrl={returnUrl}
          />
          <h1
            style={{
              margin: "0",
              fontSize: "16px",
              fontWeight: "bold",
              color: "var(--text-primary)",
            }}
          >
            {session.project}
          </h1>
          {session.branch && (
            <span
              style={{
                color: "var(--green)",
                fontSize: "12px",
              }}
            >
              {session.branch}
            </span>
          )}
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              fontFamily: "monospace",
            }}
          >
            {session.id.slice(0, 8)}
          </span>
          {session.status === "active" && session.activeState && (
            <span style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: session.activeState === "working" ? "rgba(0,100,255,0.15)"
                : session.activeState === "thinking" ? "rgba(0,255,65,0.15)"
                : session.activeState === "waiting" ? "rgba(255,170,0,0.15)"
                : "rgba(100,100,100,0.15)",
              color: session.activeState === "working" ? "var(--blue)"
                : session.activeState === "thinking" ? "var(--green)"
                : session.activeState === "waiting" ? "var(--amber)"
                : "var(--text-muted)",
            }}>
              {session.activeState}
            </span>
          )}
          <span
            id="resume-copy-btn"
            data-cmd={`cd "${session.projectPath}" && claude --resume ${session.id}`}
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              cursor: "pointer",
              padding: "2px 6px",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              marginLeft: "4px",
            }}
          >
            [ copy resume cmd ]
          </span>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var btn = document.getElementById('resume-copy-btn');
  if (!btn) return;
  btn.addEventListener('mouseenter', function() { btn.style.borderColor = 'var(--green)'; btn.style.color = 'var(--green)'; });
  btn.addEventListener('mouseleave', function() { btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--text-muted)'; });
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    var cmd = btn.getAttribute('data-cmd');
    if (window.__copyCmd) {
      window.__copyCmd(cmd, btn, 'button');
    }
  });
})();
        `}} />
      </div>

      {/* Tags */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <TagPills tags={metadata?.tags || []} sessionId={session.id} returnUrl={returnUrl} />
        <form action={addTagAction} style={{ display: "inline-flex", gap: "4px" }}>
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="returnUrl" value={returnUrl} />
          <input
            type="text"
            name="tag"
            placeholder="Add tag..."
            style={{
              background: "#111",
              color: "#ccc",
              border: "1px solid #333",
              borderRadius: "3px",
              padding: "2px 8px",
              fontSize: "11px",
              fontFamily: "inherit",
              width: "120px",
            }}
          />
          <button
            type="submit"
            style={{
              background: "#111",
              color: "#555",
              border: "1px solid #333",
              borderRadius: "3px",
              padding: "2px 8px",
              fontSize: "11px",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            +
          </button>
        </form>
      </div>

      {error === "invalid-tag" && (
        <div style={{ color: "#ff4444", fontSize: "11px", marginBottom: "8px" }}>
          Invalid tag. Use lowercase letters, numbers, and hyphens (max 30 chars, max 10 tags).
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions
        sessionId={session.id}
        projectPath={session.projectPath}
        project={session.project}
        branch={session.branch}
        duration={durationStr}
        filesChanged={session.filesChanged.length}
        tokenCount={formatTokenCount(totalTokens)}
        firstMessage={session.firstMessage}
      />

      {/* Metadata row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          padding: "12px",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        <div style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>started </span>
          {startedDate} {startedTime}
        </div>
        <div style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>duration </span>
          {formatDuration(durationMs)}
        </div>
        <div style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-muted)" }}>messages </span>
          {session.messageCount}
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>tokens </span>
          <span style={{ color: "var(--amber)" }}>
            {formatTokenCount(totalTokens)}
          </span>
        </div>
        {session.model && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>model </span>
            <span style={{ color: "#00aaff" }}>{session.model}</span>
          </div>
        )}
        {session.contextSize > 0 && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>context </span>
            <span style={{ color: "#00ff41" }}>{formatTokenCount(session.contextSize)}</span>
          </div>
        )}
        <div style={{ width: "100%" }}>
          <span style={{ color: "var(--text-muted)" }}>cwd </span>
          <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
            {session.projectPath}
          </span>
        </div>
      </div>

      {/* Session Notes */}
      <SessionNotes
        sessionId={session.id}
        notes={metadata?.notes || ""}
        returnUrl={returnUrl}
      />

      {/* Files changed */}
      {session.filesChanged.length > 0 && (
        <div
          style={{
            marginBottom: "24px",
            padding: "12px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              color: "var(--purple)",
              fontSize: "11px",
              fontWeight: "bold",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            FILES CHANGED ({session.filesChanged.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {session.filesChanged.map((filePath) => {
              const fileName = filePath.split("/").pop() || filePath;
              return (
                <Link
                  key={filePath}
                  href={`/files?q=${encodeURIComponent(fileName)}`}
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    textDecoration: "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {filePath}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Configuration */}
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
            color: "var(--text-muted)",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "0.08em",
          }}
        >
          CONFIGURATION ({totalPlugins} plugins, {totalSkills} skills,{" "}
          {totalMcpServers} MCP servers)
        </summary>
        <div
          style={{
            padding: "0 12px 12px",
            fontSize: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Plugins */}
          {globalConfig.plugins.length > 0 && (
            <div>
              <span style={{ color: "var(--text-muted)" }}>plugins: </span>
              <span style={{ color: "var(--green)" }}>
                {globalConfig.plugins
                  .map((p) => `${p.name}${p.enabled ? "" : " (disabled)"}`)
                  .join(", ")}
              </span>
            </div>
          )}

          {/* Skills */}
          {totalSkills > 0 && (
            <div>
              <span style={{ color: "var(--text-muted)" }}>skills: </span>
              <span style={{ color: "var(--blue)" }}>
                {[
                  ...globalConfig.skills.map((s) => s.name),
                  ...globalConfig.plugins.flatMap((p) =>
                    p.skills.map((s) => s.name)
                  ),
                ].join(", ")}
              </span>
            </div>
          )}

          {/* MCP Servers */}
          {totalMcpServers > 0 && (
            <div>
              <span style={{ color: "var(--text-muted)" }}>mcp servers: </span>
              <span style={{ color: "var(--amber)" }}>
                {[
                  ...globalConfig.mcpServers.map((s) => s.name),
                  ...projectConfig.mcpServers.map((s) => `${s.name} (project)`),
                ].join(", ")}
              </span>
            </div>
          )}

          {/* Project-level config */}
          {(projectConfig.hasClaudeMd || projectConfig.mcpServers.length > 0) && (
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "8px", marginTop: "4px" }}>
              <span style={{ color: "var(--text-muted)" }}>project config: </span>
              {projectConfig.hasClaudeMd && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "3px",
                    background: "var(--bg-secondary)",
                    color: "var(--green)",
                    marginRight: "4px",
                  }}
                >
                  CLAUDE.md
                </span>
              )}
              {projectConfig.mcpServers.length > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "3px",
                    background: "var(--bg-secondary)",
                    color: "var(--amber)",
                  }}
                >
                  .mcp.json
                </span>
              )}
            </div>
          )}
        </div>
      </details>

      {/* Conversation entries */}
      <div>
        {serializedEntries.map((entry, i) => (
          <ConversationEntry
            key={`${entry.uuid}-${i}`}
            entry={entry}
          />
        ))}
        {serializedEntries.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "32px",
            }}
          >
            No conversation entries found.
          </div>
        )}
      </div>
    </div>
  );
}
