import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionDetail } from "@/lib/claude-data";
import { getSessionMetadata } from "@/lib/session-metadata";
import ConversationEntry from "@/src/components/conversation-entry";
import { BookmarkButton } from "@/src/components/bookmark-button";
import { TagPills } from "@/src/components/tag-pills";
import { addTagAction } from "@/src/app/actions/metadata";
import { saveNotesAction } from "@/src/app/actions/metadata";
import { formatTokenCount, formatDuration } from "@/lib/path-utils";
import { getGlobalConfig, getProjectConfig } from "@/lib/config-data";
import LiveSession from "@/src/components/live-session";
import Terminal from "@/src/components/terminal";
import CodeImpactView from "@/src/components/code-impact-view";

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
  const { session, entries, codeImpact } = result;
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

  const serializedEntries = entries
    .map((e) => ({
      ...e,
      timestamp:
        e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
    }))
    .reverse(); // Latest first

  const resumeCmd = `cd "${session.projectPath}" && claude --resume ${session.id}`;
  const shortId = session.id.slice(0, 8);
  const cdCmd = `cd "${session.projectPath}"`;
  const codeCmd = `code "${session.projectPath}"`;
  const summary = [
    `Session: ${shortId}`,
    `Project: ${session.project}`,
    `Branch: ${session.branch}`,
    `Duration: ${durationStr}`,
    `Files changed: ${session.filesChanged.length}`,
    `Tokens: ${formatTokenCount(totalTokens)}`,
    session.firstMessage
      ? `---\n${session.firstMessage.slice(0, 200)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const notesPreview = metadata?.notes
    ? metadata.notes.split("\n")[0].slice(0, 40)
    : "No notes";

  return (
    <div className="ide-layout">
      {/* ═══ HEADER BAR ═══════════════════════════════════════ */}
      <div className="ide-header" style={{ position: "relative" }}>
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
          }}
        >
          &larr; back
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <BookmarkButton
          sessionId={session.id}
          bookmarked={metadata?.bookmarked || false}
          returnUrl={returnUrl}
          size="sm"
        />
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          {session.project}
        </span>
        {session.branch && (
          <span style={{ color: "var(--green)", fontSize: "12px" }}>
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
          {shortId}
        </span>
        {session.status === "active" && session.activeState && (
          <span
            className="ide-active-badge"
            style={{
              background:
                session.activeState === "working"
                  ? "rgba(0,100,255,0.15)"
                  : session.activeState === "thinking"
                    ? "rgba(0,255,65,0.15)"
                    : session.activeState === "waiting"
                      ? "rgba(255,170,0,0.15)"
                      : "rgba(100,100,100,0.15)",
              color:
                session.activeState === "working"
                  ? "var(--blue)"
                  : session.activeState === "thinking"
                    ? "var(--green)"
                    : session.activeState === "waiting"
                      ? "var(--amber)"
                      : "var(--text-muted)",
            }}
          >
            {session.activeState}
          </span>
        )}
        <span
          id="resume-copy-btn"
          data-cmd={resumeCmd}
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            cursor: "pointer",
            padding: "2px 6px",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            marginLeft: "auto",
          }}
        >
          [ copy resume cmd ]
        </span>
        <div className="ide-header-glow" />
      </div>

      {/* ═══ MAIN AREA: SIDEBAR + CENTER ═══════════════════════ */}
      <div className="ide-main">
        {/* ─── LEFT SIDEBAR ──────────────────────────────────── */}
        <div className="ide-sidebar">
          {/* Stats section — compact grid */}
          <div className="ide-sidebar-section" style={{ padding: "8px 14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", fontSize: "11px" }}>
              <div><span style={{ color: "var(--text-muted)" }}>started </span><span style={{ color: "var(--text-secondary)" }}>{startedDate} {startedTime}</span></div>
              <div><span style={{ color: "var(--text-muted)" }}>duration </span><span style={{ color: "var(--text-secondary)" }}>{durationStr}</span></div>
              <div><span style={{ color: "var(--text-muted)" }}>messages </span><span style={{ color: "var(--text-secondary)" }}>{session.messageCount}</span></div>
              <div><span style={{ color: "var(--text-muted)" }}>tokens </span><span style={{ color: "var(--amber)" }}>{formatTokenCount(totalTokens)}</span></div>
              {session.model && (
                <div><span style={{ color: "var(--text-muted)" }}>model </span><span style={{ color: "var(--blue)" }}>{session.model}</span></div>
              )}
              {session.contextSize > 0 && (
                <div><span style={{ color: "var(--text-muted)" }}>context </span><span style={{ color: "var(--green)" }}>{formatTokenCount(session.contextSize)}</span></div>
              )}
            </div>
          </div>

          {/* Actions section — 2x2 grid */}
          <div className="ide-sidebar-section" style={{ padding: "6px 14px" }}>
            <div id="quick-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              <button type="button" className="ide-action-btn" data-copy-action={resumeCmd} data-copy-label="resume command">Resume</button>
              <button type="button" className="ide-action-btn" data-copy-action={codeCmd} data-copy-label="code command">VS Code</button>
              <button type="button" className="ide-action-btn" data-copy-action={summary} data-copy-label="session summary">Summary</button>
              <a href={`/api/export/${session.id}`} className="ide-action-btn" style={{ textDecoration: "none" }}>Export</a>
            </div>
          </div>

          {/* Tags section */}
          <div className="ide-sidebar-section">
            <div className="ide-sidebar-label">Tags</div>
            <TagPills
              tags={metadata?.tags || []}
              sessionId={session.id}
              returnUrl={returnUrl}
            />
            <form action={addTagAction} className="ide-tag-form">
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="returnUrl" value={returnUrl} />
              <input
                type="text"
                name="tag"
                placeholder="Add tag..."
                className="ide-tag-input"
              />
              <button type="submit" className="ide-tag-submit">
                +
              </button>
            </form>
            {error === "invalid-tag" && (
              <div className="ide-error">
                Invalid tag. Lowercase, numbers, hyphens (max 30 chars, 10 tags).
              </div>
            )}
          </div>

          {/* ─── Collapsible: FILES CHANGED ──────────────── */}
          {session.filesChanged.length > 0 && (
            <details>
              <summary style={{ color: "var(--purple)" }}>
                FILES CHANGED ({session.filesChanged.length})
              </summary>
              <div className="ide-sidebar-detail-content">
                <div className="ide-file-list">
                  {session.filesChanged.map((filePath) => {
                    const fileName = filePath.split("/").pop() || filePath;
                    const relPath = filePath.startsWith(session.projectPath)
                      ? filePath.slice(session.projectPath.length + 1)
                      : filePath;
                    return (
                      <Link
                        key={filePath}
                        href={`/files?repo=${encodeURIComponent(session.project)}&q=${encodeURIComponent(fileName)}`}
                      >
                        {relPath}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </details>
          )}

          {/* ─── Collapsible: CODE IMPACT ────────────────── */}
          <CodeImpactView impact={codeImpact} repoPath={session.projectPath} />

          {/* ─── Collapsible: CONFIGURATION ──────────────── */}
          <details>
            <summary>
              CONFIGURATION ({totalPlugins}P / {totalSkills}S / {totalMcpServers}M)
            </summary>
            <div className="ide-sidebar-detail-content">
              <div className="ide-config-content">
                {globalConfig.plugins.length > 0 && (
                  <div className="ide-config-row">
                    <span className="ide-config-label">plugins</span>
                    <span className="ide-config-value" style={{ color: "var(--green)" }}>
                      {globalConfig.plugins
                        .map(
                          (p) => `${p.name}${p.enabled ? "" : " (off)"}`
                        )
                        .join(", ")}
                    </span>
                  </div>
                )}
                {totalSkills > 0 && (
                  <div className="ide-config-row">
                    <span className="ide-config-label">skills</span>
                    <span className="ide-config-value" style={{ color: "var(--blue)" }}>
                      {[
                        ...globalConfig.skills.map((s) => s.name),
                        ...globalConfig.plugins.flatMap((p) =>
                          p.skills.map((s) => s.name)
                        ),
                      ].join(", ")}
                    </span>
                  </div>
                )}
                {totalMcpServers > 0 && (
                  <div className="ide-config-row">
                    <span className="ide-config-label">mcp servers</span>
                    <span className="ide-config-value" style={{ color: "var(--amber)" }}>
                      {[
                        ...globalConfig.mcpServers.map((s) => s.name),
                        ...projectConfig.mcpServers.map(
                          (s) => `${s.name} (project)`
                        ),
                      ].join(", ")}
                    </span>
                  </div>
                )}
                {(projectConfig.hasClaudeMd ||
                  projectConfig.mcpServers.length > 0) && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border-light)",
                      paddingTop: "6px",
                      marginTop: "4px",
                      display: "flex",
                      gap: "4px",
                      flexWrap: "wrap",
                    }}
                  >
                    {projectConfig.hasClaudeMd && (
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 6px",
                          borderRadius: "3px",
                          background: "var(--bg-secondary)",
                          color: "var(--green)",
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
            </div>
          </details>

          {/* ─── Collapsible: NOTES ──────────────────────── */}
          <details>
            <summary style={{ color: "var(--amber)" }}>
              NOTES{" "}
              <span
                style={{
                  color: "var(--text-muted)",
                  fontWeight: "normal",
                  fontSize: "10px",
                }}
              >
                {notesPreview}
              </span>
            </summary>
            <div className="ide-sidebar-detail-content ide-notes-section">
              <form action={saveNotesAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="returnUrl" value={returnUrl} />
                <textarea
                  name="notes"
                  defaultValue={metadata?.notes || ""}
                  rows={4}
                  placeholder="Add notes about this session..."
                />
                <button type="submit">Save</button>
              </form>
            </div>
          </details>

          {/* CWD — pinned to bottom */}
          <div className="ide-cwd">
            <div className="ide-cwd-label">cwd</div>
            {session.projectPath}
          </div>
        </div>

        {/* ─── SIDEBAR RESIZE HANDLE ─────────────────────────── */}
        <div id="ide-sidebar-drag" className="ide-sidebar-drag">{" "}</div>

        {/* ─── CENTER: CONVERSATION ──────────────────────────── */}
        <div className="ide-center">
          {session.status === "active" ? (
            <LiveSession
              sessionId={session.id}
              initialEntries={serializedEntries}
            />
          ) : (
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
          )}
        </div>
      </div>

      {/* ═══ BOTTOM DOCK: TERMINAL ════════════════════════════ */}
      <details className="ide-dock">
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
    </div>
  );
}
