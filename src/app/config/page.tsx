export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getGlobalConfig, getRepoConfigs } from "@/lib/config-data";
import { getAIConfig, maskApiKey, DEFAULT_INSIGHTS_PROMPT } from "@/lib/ai-config";
import StatCard from "@/components/stat-card";
import TerminalLoader from "@/src/components/terminal-loader";

const sectionHeaderStyle = {
  textTransform: "uppercase" as const,
  fontSize: "10px",
  color: "var(--text-muted)",
  letterSpacing: "0.1em",
  borderBottom: "1px solid var(--border)",
  paddingBottom: "8px",
  marginBottom: "16px",
  marginTop: "32px",
};

const preStyle = {
  margin: 0,
  fontFamily: "monospace",
  fontSize: "11px",
  color: "var(--text-secondary)",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  maxHeight: "400px",
  overflow: "auto" as const,
  padding: "12px",
  background: "var(--bg-secondary)",
  borderRadius: "4px",
};

const panelStyle = {
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  marginBottom: "24px",
};

const panelHeaderStyle = (color: string) => ({
  padding: "10px 16px",
  borderBottom: "1px solid var(--border)",
  color,
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
});

const summaryStyle = {
  padding: "8px 16px",
  cursor: "pointer" as const,
  display: "flex" as const,
  alignItems: "center" as const,
  gap: "10px",
  fontSize: "13px",
  listStyle: "none" as const,
};

const badgeStyle = (color: string) => ({
  fontSize: "10px",
  padding: "1px 6px",
  borderRadius: "3px",
  background: "var(--bg-secondary)",
  color,
});

const emptyStyle = {
  padding: "32px",
  textAlign: "center" as const,
  color: "var(--text-muted)",
};

const subHeaderStyle = (color: string) => ({
  fontSize: "11px",
  color,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  marginBottom: "8px",
  marginTop: "12px",
});

async function ConfigContent({
  aiSaved,
  aiError,
}: {
  aiSaved: boolean;
  aiError: string | null;
}) {
  const [config, repoConfigs, aiConfig] = await Promise.all([
    getGlobalConfig(),
    getRepoConfigs(),
    getAIConfig(),
  ]);

  const pluginCount = config.plugins.length;
  const enabledCount = config.plugins.filter((p) => p.enabled).length;

  const pluginSkillCount = config.plugins.reduce(
    (sum, p) => sum + p.skills.length,
    0
  );
  const globalSkillCount = config.skills.length;
  const totalSkills = globalSkillCount + pluginSkillCount;

  const mcpServerCount = config.mcpServers.length;

  // Global commands only (not plugin commands)
  const globalCommands = config.commands.filter((c) => c.source === "global");
  const globalCommandCount = globalCommands.length;

  const repoCount = repoConfigs.length;

  return (
    <div style={{ padding: "16px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          label="Plugins"
          value={String(pluginCount)}
          subtitle={`${enabledCount} enabled`}
          color="var(--green)"
        />
        <StatCard
          label="Skills"
          value={String(totalSkills)}
          subtitle={`${globalSkillCount} global`}
          color="var(--blue)"
        />
        <StatCard
          label="MCP Servers"
          value={String(mcpServerCount)}
          color="var(--amber)"
        />
        <StatCard
          label="Commands"
          value={String(globalCommandCount)}
          color="var(--purple)"
        />
        <StatCard
          label="Repos"
          value={String(repoCount)}
          subtitle="with config"
          color="#00cccc"
        />
      </div>

      {/* AI Provider Configuration */}
      <div style={sectionHeaderStyle}>AI Provider</div>

      {aiSaved && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "16px",
            background: "rgba(0,255,65,0.08)",
            border: "1px solid rgba(0,255,65,0.3)",
            borderRadius: "4px",
            fontSize: "12px",
            color: "var(--green)",
          }}
        >
          AI provider configuration saved successfully.
        </div>
      )}

      {aiError && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "16px",
            background: "rgba(255,60,60,0.08)",
            border: "1px solid rgba(255,60,60,0.3)",
            borderRadius: "4px",
            fontSize: "12px",
            color: "var(--red, #ff3c3c)",
          }}
        >
          {decodeURIComponent(aiError)}
        </div>
      )}

      <div style={panelStyle}>
        <div style={panelHeaderStyle("var(--purple)")}>
          OpenAI-Compatible Provider
        </div>
        <div style={{ padding: "16px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "16px",
              lineHeight: "1.5",
            }}
          >
            Configure any OpenAI-compatible API (OpenRouter, OpenAI, Ollama, Together, Groq, etc.)
            to power the session Insights feature.
          </div>
          <form
            action="/api/ai-config"
            method="POST"
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div>
              <label
                htmlFor="ai-base-url"
                style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}
              >
                Base URL
              </label>
              <input
                id="ai-base-url"
                name="baseUrl"
                type="text"
                defaultValue={aiConfig?.baseUrl || ""}
                placeholder="https://openrouter.ai/api/v1"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="ai-api-key"
                style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}
              >
                API Key {aiConfig && (
                  <span style={{ color: "var(--text-muted)" }}>
                    (current: {maskApiKey(aiConfig.apiKey)})
                  </span>
                )}
              </label>
              <input
                id="ai-api-key"
                name="apiKey"
                type="password"
                defaultValue={aiConfig?.apiKey || ""}
                placeholder="sk-..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="ai-model"
                style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}
              >
                Model
              </label>
              <input
                id="ai-model"
                name="model"
                type="text"
                defaultValue={aiConfig?.model || ""}
                placeholder="openai/gpt-4o-mini"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="ai-system-prompt"
                style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}
              >
                System Prompt{" "}
                <span style={{ color: "var(--text-muted)" }}>
                  (customize how session insights are generated)
                </span>
              </label>
              <textarea
                id="ai-system-prompt"
                name="systemPrompt"
                defaultValue={aiConfig?.systemPrompt || DEFAULT_INSIGHTS_PROMPT}
                rows={12}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  lineHeight: "1.5",
                }}
              />
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                Leave empty to use the default prompt. The conversation is appended as a user message automatically.
              </div>
            </div>
            <div>
              <button
                type="submit"
                style={{
                  background: "rgba(0,255,65,0.1)",
                  border: "1px solid var(--green)",
                  color: "var(--green)",
                  padding: "8px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  letterSpacing: "0.04em",
                }}
              >
                [ Save ]
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Global Configuration */}
      <div style={sectionHeaderStyle}>Global Configuration</div>

      {/* Plugins Section */}
      <details style={panelStyle}>
        <summary style={{ ...panelHeaderStyle("var(--green)"), cursor: "pointer" }}>
          Plugins ({pluginCount})
        </summary>

        {config.plugins.length === 0 && (
          <div style={emptyStyle}>no plugins installed</div>
        )}

        {config.plugins.map((plugin) => {
          const statusColor = plugin.blocked
            ? "var(--red)"
            : plugin.enabled
              ? "var(--green)"
              : "var(--text-muted)";

          return (
            <details
              key={`${plugin.marketplace}-${plugin.name}`}
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <summary style={summaryStyle}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: statusColor,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--text-primary)" }}>
                  {plugin.name}
                </span>
                <span style={badgeStyle("var(--text-muted)")}>
                  {plugin.marketplace}
                </span>
                {plugin.blocked && (
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      background: "rgba(255,0,0,0.15)",
                      color: "var(--red)",
                    }}
                  >
                    blocked
                  </span>
                )}
              </summary>
              <div
                style={{
                  padding: "8px 16px 12px 34px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {plugin.description && (
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>desc: </span>
                    {plugin.description}
                  </div>
                )}
                <div>
                  <span style={{ color: "var(--text-muted)" }}>version: </span>
                  {plugin.version}
                </div>
                {plugin.mcpServers.length > 0 && (
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>
                      mcp servers:{" "}
                    </span>
                    {plugin.mcpServers.map((s) => s.name).join(", ")}
                  </div>
                )}
                {plugin.hooks.length > 0 && (
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>
                      hook events:{" "}
                    </span>
                    {plugin.hooks.map((h) => h.event).join(", ")}
                  </div>
                )}
                {plugin.skills.length > 0 && (
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>
                      skills:{" "}
                    </span>
                    {plugin.skills.map((s) => s.name).join(", ")}
                  </div>
                )}
                {plugin.blocked && (
                  <div style={{ color: "var(--red)" }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      block reason:{" "}
                    </span>
                    {plugin.blocked.text}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </details>

      {/* Global Skills Section */}
      <details style={panelStyle}>
        <summary style={{ ...panelHeaderStyle("var(--blue)"), cursor: "pointer" }}>
          Global Skills ({globalSkillCount})
        </summary>

        {config.skills.length === 0 && (
          <div style={emptyStyle}>no global skills configured</div>
        )}

        {config.skills.map((skill) => (
          <details
            key={`global-skill-${skill.name}`}
            style={{ borderBottom: "1px solid var(--border-light)" }}
          >
            <summary style={summaryStyle}>
              <span style={{ color: "var(--text-primary)" }}>
                {skill.name}
              </span>
              <span style={badgeStyle("var(--blue)")}>global</span>
            </summary>
            <div style={{ padding: "8px 16px 12px 34px", fontSize: "12px" }}>
              {skill.content ? (
                <pre style={preStyle}>{skill.content}</pre>
              ) : (
                <div
                  style={{
                    color: "var(--text-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {skill.description && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>
                        desc:{" "}
                      </span>
                      {skill.description}
                    </div>
                  )}
                  {skill.allowedTools && skill.allowedTools.length > 0 && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>
                        allowed tools:{" "}
                      </span>
                      {skill.allowedTools.join(", ")}
                    </div>
                  )}
                  {!skill.description &&
                    (!skill.allowedTools ||
                      skill.allowedTools.length === 0) && (
                      <div style={{ color: "var(--text-muted)" }}>
                        no additional details
                      </div>
                    )}
                </div>
              )}
            </div>
          </details>
        ))}
      </details>

      {/* Global Commands Section */}
      <details style={panelStyle}>
        <summary style={{ ...panelHeaderStyle("var(--purple)"), cursor: "pointer" }}>
          Global Commands ({globalCommandCount})
        </summary>

        {globalCommands.length === 0 && (
          <div style={emptyStyle}>no global commands found</div>
        )}

        {globalCommands.map((cmd) => (
          <details
            key={`global-cmd-${cmd.name}`}
            style={{ borderBottom: "1px solid var(--border-light)" }}
          >
            <summary style={summaryStyle}>
              <span style={{ color: "var(--text-primary)" }}>/{cmd.name}</span>
              <span style={badgeStyle("var(--blue)")}>global</span>
            </summary>
            <div style={{ padding: "8px 16px 12px 34px", fontSize: "12px" }}>
              <pre style={preStyle}>{cmd.content || cmd.preview}</pre>
            </div>
          </details>
        ))}
      </details>

      {/* MCP Servers Section */}
      <details style={panelStyle}>
        <summary style={{ ...panelHeaderStyle("var(--amber)"), cursor: "pointer" }}>
          MCP Servers ({mcpServerCount})
        </summary>

        {config.mcpServers.length === 0 && (
          <div style={emptyStyle}>no MCP servers configured</div>
        )}

        {config.mcpServers.map((server) => (
          <details
            key={`${server.source}-${server.pluginName ?? "project"}-${server.name}`}
            style={{ borderBottom: "1px solid var(--border-light)" }}
          >
            <summary style={summaryStyle}>
              <span style={{ color: "var(--text-primary)" }}>
                {server.name}
              </span>
              <span style={badgeStyle("var(--text-muted)")}>
                {server.pluginName ?? "project"}
              </span>
            </summary>
            <div
              style={{
                padding: "8px 16px 12px 34px",
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {server.type && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>type: </span>
                  {server.type}
                </div>
              )}
              <div>
                <span style={{ color: "var(--text-muted)" }}>command: </span>
                <span style={{ fontFamily: "monospace" }}>
                  {server.command}
                  {server.args.length > 0 && ` ${server.args.join(" ")}`}
                </span>
              </div>
            </div>
          </details>
        ))}
      </details>

      {/* Per-Repo Configuration */}
      <div style={sectionHeaderStyle}>
        Per-Repo Configuration ({repoCount} repos)
      </div>

      {repoConfigs.length === 0 && (
        <div style={{ ...panelStyle, ...emptyStyle }}>
          no repos with configuration found
        </div>
      )}

      {repoConfigs.map((repo) => (
        <div key={repo.repoPath} style={{ ...panelStyle }}>
          <details>
            <summary
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                listStyle: "none",
              }}
            >
              <span style={{ color: "#00cccc", fontWeight: "bold" }}>
                {repo.repoName}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {repo.repoPath}
              </span>
              {!repo.claudeMdContent && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "3px",
                    background: "rgba(204, 136, 0, 0.15)",
                    color: "#cc8800",
                    flexShrink: 0,
                  }}
                >
                  ! no CLAUDE.md
                </span>
              )}
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>&#9776;</span>
                {repo.sessionCount}
              </span>
            </summary>

            <div
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingBottom: "12px",
              }}
            >
              {/* CLAUDE.md */}
              {repo.claudeMdContent ? (
                <details
                  style={{
                    borderBottom: "1px solid var(--border-light)",
                    marginBottom: "4px",
                  }}
                >
                  <summary
                    style={{
                      ...summaryStyle,
                      padding: "8px 0",
                      color: "var(--green)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    CLAUDE.md
                  </summary>
                  <div style={{ padding: "4px 0 8px" }}>
                    <pre style={preStyle}>{repo.claudeMdContent}</pre>
                  </div>
                </details>
              ) : (
                <div
                  style={{
                    borderBottom: "1px solid var(--border-light)",
                    marginBottom: "4px",
                    padding: "8px 0",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ color: "#cc8800" }}>!</span>
                  <span>CLAUDE.md</span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      background: "rgba(204, 136, 0, 0.15)",
                      color: "#cc8800",
                    }}
                  >
                    missing
                  </span>
                </div>
              )}

              {/* AGENTS.md */}
              {repo.agentsMdContent && (
                <details
                  style={{
                    borderBottom: "1px solid var(--border-light)",
                    marginBottom: "4px",
                  }}
                >
                  <summary
                    style={{
                      ...summaryStyle,
                      padding: "8px 0",
                      color: "var(--green)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    AGENTS.md
                  </summary>
                  <div style={{ padding: "4px 0 8px" }}>
                    <pre style={preStyle}>{repo.agentsMdContent}</pre>
                  </div>
                </details>
              )}

              {/* Commands */}
              {repo.commands.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={subHeaderStyle("var(--purple)")}>
                    Commands ({repo.commands.length})
                  </div>
                  {repo.commands.map((cmd) => (
                    <details
                      key={cmd.name}
                      style={{
                        borderBottom: "1px solid var(--border-light)",
                        marginBottom: "2px",
                      }}
                    >
                      <summary
                        style={{
                          ...summaryStyle,
                          padding: "6px 0",
                          color: "var(--text-primary)",
                        }}
                      >
                        /{cmd.name}
                      </summary>
                      <div style={{ padding: "4px 0 8px" }}>
                        <pre style={preStyle}>{cmd.content}</pre>
                      </div>
                    </details>
                  ))}
                </div>
              )}

              {/* Skills */}
              {repo.skills.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={subHeaderStyle("var(--blue)")}>
                    Skills ({repo.skills.length})
                  </div>
                  {repo.skills.map((skill) => (
                    <details
                      key={skill.name}
                      style={{
                        borderBottom: "1px solid var(--border-light)",
                        marginBottom: "2px",
                      }}
                    >
                      <summary
                        style={{
                          ...summaryStyle,
                          padding: "6px 0",
                          color: "var(--text-primary)",
                        }}
                      >
                        {skill.name}
                      </summary>
                      <div style={{ padding: "4px 0 8px" }}>
                        <pre style={preStyle}>{skill.content}</pre>
                      </div>
                    </details>
                  ))}
                </div>
              )}

              {/* Permissions */}
              {repo.permissions && (
                <div style={{ marginTop: "8px" }}>
                  <div style={subHeaderStyle("var(--green)")}>Permissions</div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      padding: "4px 0",
                    }}
                  >
                    <div style={{ marginBottom: "4px" }}>
                      <span style={{ color: "var(--text-muted)" }}>
                        allow:{" "}
                      </span>
                      {repo.permissions.allow.length > 0 ? (
                        repo.permissions.allow.map((p) => (
                          <span
                            key={p}
                            style={{
                              ...badgeStyle("var(--green)"),
                              marginRight: "4px",
                              display: "inline-block",
                              marginBottom: "2px",
                            }}
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>none</span>
                      )}
                    </div>
                    {repo.permissions.deny && repo.permissions.deny.length > 0 && (
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>
                          deny:{" "}
                        </span>
                        {repo.permissions.deny.map((p) => (
                          <span
                            key={p}
                            style={{
                              ...badgeStyle("var(--red)"),
                              marginRight: "4px",
                              display: "inline-block",
                              marginBottom: "2px",
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hooks */}
              {repo.hooks && repo.hooks.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={subHeaderStyle("var(--amber)")}>
                    Hooks ({repo.hooks.length})
                  </div>
                  {repo.hooks.map((hook, i) => (
                    <div
                      key={`${hook.event}-${i}`}
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        padding: "4px 0",
                        borderBottom: "1px solid var(--border-light)",
                      }}
                    >
                      <span style={{ color: "var(--amber)" }}>
                        {hook.event}
                      </span>
                      {hook.matcher && (
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}
                          ({hook.matcher})
                        </span>
                      )}
                      <span style={{ color: "var(--text-muted)" }}> → </span>
                      <span style={{ fontFamily: "monospace", fontSize: "11px" }}>
                        {hook.commands.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ ai_saved?: string; ai_error?: string }>;
}) {
  const { ai_saved, ai_error } = await searchParams;
  return (
    <Suspense fallback={<TerminalLoader message="loading config" />}>
      <ConfigContent aiSaved={ai_saved === "true"} aiError={ai_error || null} />
    </Suspense>
  );
}
