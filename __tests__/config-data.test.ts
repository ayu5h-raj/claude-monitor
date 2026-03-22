import { describe, it, expect } from "vitest";
import type {
  PluginInfo,
  SkillInfo,
  McpServerInfo,
  CommandInfo,
  HookInfo,
  GlobalConfig,
} from "@/lib/types";

describe("Config types", () => {
  it("PluginInfo accepts valid shape", () => {
    const plugin: PluginInfo = {
      name: "superpowers",
      marketplace: "claude-plugins-official",
      version: "5.0.5",
      enabled: true,
      description: "Superpowers plugin",
      mcpServers: [],
      hooks: [],
      skills: [],
      commands: [],
    };
    expect(plugin.name).toBe("superpowers");
  });

  it("PluginInfo accepts blocked field", () => {
    const plugin: PluginInfo = {
      name: "blocked-plugin",
      marketplace: "claude-plugins-official",
      version: "1.0.0",
      enabled: false,
      blocked: { reason: "security", text: "Blocked for security" },
      mcpServers: [],
      hooks: [],
      skills: [],
      commands: [],
    };
    expect(plugin.blocked?.reason).toBe("security");
  });

  it("SkillInfo description is optional", () => {
    const skill: SkillInfo = {
      name: "my-skill",
      source: "global",
    };
    expect(skill.description).toBeUndefined();
  });

  it("McpServerInfo type field is optional", () => {
    const mcp: McpServerInfo = {
      name: "context7",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      source: "plugin",
      pluginName: "context7",
    };
    expect(mcp.type).toBeUndefined();
  });

  it("CommandInfo accepts valid shape", () => {
    const cmd: CommandInfo = {
      name: "review",
      filename: "review.md",
      source: "plugin",
      pluginName: "code-review-graph",
      preview: "Run code review...",
    };
    expect(cmd.filename).toBe("review.md");
  });

  it("HookInfo supports multiple commands", () => {
    const hook: HookInfo = {
      event: "SessionStart",
      commands: ["node script.js", "bun run.ts"],
      pluginName: "code-review-graph",
    };
    expect(hook.commands).toHaveLength(2);
  });

  it("GlobalConfig has all sections", () => {
    const config: GlobalConfig = {
      plugins: [],
      skills: [],
      mcpServers: [],
      commands: [],
      hooks: [],
    };
    expect(Object.keys(config)).toHaveLength(5);
  });
});
