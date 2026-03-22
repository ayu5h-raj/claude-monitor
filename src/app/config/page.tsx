export const dynamic = "force-dynamic";

import { getGlobalConfig } from "@/lib/config-data";
import StatCard from "@/components/stat-card";

export default async function ConfigPage() {
  const config = await getGlobalConfig();

  const pluginCount = config.plugins.length;
  const enabledCount = config.plugins.filter((p) => p.enabled).length;

  // Total skills = global skills + all plugin-embedded skills
  const pluginSkillCount = config.plugins.reduce(
    (sum, p) => sum + p.skills.length,
    0
  );
  const globalSkillCount = config.skills.length;
  const totalSkills = globalSkillCount + pluginSkillCount;

  const mcpServerCount = config.mcpServers.length;
  const commandCount = config.commands.length;

  // Collect all skills: global first, then plugin-embedded
  const allSkills = [
    ...config.skills,
    ...config.plugins.flatMap((p) => p.skills),
  ];

  return (
    <div style={{ padding: "16px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
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
          value={String(commandCount)}
          color="var(--purple)"
        />
      </div>

      {/* ── Plugins Section ── */}
      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            color: "var(--green)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Plugins ({pluginCount})
        </div>

        {config.plugins.length === 0 && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            no plugins installed
          </div>
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
              style={{
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <summary
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "13px",
                  listStyle: "none",
                }}
              >
                {/* Status dot */}
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
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "3px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                  }}
                >
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
      </div>

      {/* ── Skills Section ── */}
      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            color: "var(--blue)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Skills ({totalSkills})
        </div>

        {allSkills.length === 0 && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            no skills configured
          </div>
        )}

        {allSkills.map((skill) => (
          <details
            key={`${skill.source}-${skill.pluginName ?? "global"}-${skill.name}`}
            style={{
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            <summary
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                listStyle: "none",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>{skill.name}</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  background: "var(--bg-secondary)",
                  color:
                    skill.source === "global"
                      ? "var(--blue)"
                      : "var(--text-muted)",
                }}
              >
                {skill.source === "global" ? "global" : skill.pluginName}
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
              {skill.description && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>desc: </span>
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
                (!skill.allowedTools || skill.allowedTools.length === 0) && (
                  <div style={{ color: "var(--text-muted)" }}>
                    no additional details
                  </div>
                )}
            </div>
          </details>
        ))}
      </div>

      {/* ── MCP Servers Section ── */}
      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            color: "var(--amber)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          MCP Servers ({mcpServerCount})
        </div>

        {config.mcpServers.length === 0 && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            no MCP servers configured
          </div>
        )}

        {config.mcpServers.map((server) => (
          <details
            key={`${server.source}-${server.pluginName ?? "project"}-${server.name}`}
            style={{
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            <summary
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                listStyle: "none",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>
                {server.name}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  background: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                }}
              >
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
      </div>

      {/* ── Commands Section ── */}
      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            color: "var(--purple)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Commands ({commandCount})
        </div>

        {config.commands.length === 0 && (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            no custom commands found
          </div>
        )}

        {config.commands.map((cmd) => (
          <details
            key={`${cmd.source}-${cmd.pluginName ?? "global"}-${cmd.name}`}
            style={{
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            <summary
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                listStyle: "none",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>/{cmd.name}</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  background: "var(--bg-secondary)",
                  color:
                    cmd.source === "global"
                      ? "var(--blue)"
                      : "var(--text-muted)",
                }}
              >
                {cmd.source === "global" ? "global" : cmd.pluginName}
              </span>
            </summary>
            <div
              style={{
                padding: "8px 16px 12px 34px",
                fontSize: "12px",
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {cmd.preview}
              </pre>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
