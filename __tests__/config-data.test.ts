import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// ─── Config data access tests ──────────────────────────────────

import fs from "fs/promises";
import path from "path";
import os from "os";

// We need to mock fs before importing the module under test
vi.mock("fs/promises");
const mockFs = vi.mocked(fs);

// Dynamic import so mocks are in place
async function importConfigData() {
  // Clear module cache to get fresh imports with current mocks
  const mod = await import("@/lib/config-data");
  return mod;
}

describe("getGlobalConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("returns empty config when ~/.claude does not exist", async () => {
    // All filesystem reads fail
    mockFs.readFile.mockRejectedValue(new Error("ENOENT"));
    mockFs.readdir.mockRejectedValue(new Error("ENOENT"));
    mockFs.stat.mockRejectedValue(new Error("ENOENT"));
    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getGlobalConfig } = await importConfigData();
    const config = await getGlobalConfig();

    expect(config.plugins).toEqual([]);
    expect(config.skills).toEqual([]);
    expect(config.mcpServers).toEqual([]);
    expect(config.commands).toEqual([]);
    expect(config.hooks).toEqual([]);
  });

  it("reads enabled plugins from settings.json", async () => {
    const claudeDir = path.join(os.homedir(), ".claude");

    mockFs.readFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join(claudeDir, "settings.json")) {
        return JSON.stringify({
          enabledPlugins: {
            "context7@claude-plugins-official": true,
            "review-tool@community": false,
          },
        });
      }
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      // plugins/cache has one marketplace
      if (p === path.join(claudeDir, "plugins", "cache")) {
        return ["claude-plugins-official"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      // marketplace has one plugin
      if (
        p ===
        path.join(claudeDir, "plugins", "cache", "claude-plugins-official")
      ) {
        return ["context7"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      // plugin has one version
      if (
        p ===
        path.join(
          claudeDir,
          "plugins",
          "cache",
          "claude-plugins-official",
          "context7"
        )
      ) {
        return ["1.0.0"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      throw new Error("ENOENT");
    });

    mockFs.stat.mockImplementation(async (filePath: unknown) => {
      // All directories return isDirectory true
      return { isDirectory: () => true } as Awaited<
        ReturnType<typeof fs.stat>
      >;
    });

    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getGlobalConfig } = await importConfigData();
    const config = await getGlobalConfig();

    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].name).toBe("context7");
    expect(config.plugins[0].marketplace).toBe("claude-plugins-official");
    expect(config.plugins[0].version).toBe("1.0.0");
    expect(config.plugins[0].enabled).toBe(true);
  });

  it("marks plugins as disabled when not in enabledPlugins", async () => {
    const claudeDir = path.join(os.homedir(), ".claude");

    mockFs.readFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join(claudeDir, "settings.json")) {
        return JSON.stringify({ enabledPlugins: {} });
      }
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p === path.join(claudeDir, "plugins", "cache")) {
        return ["marketplace1"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      if (p === path.join(claudeDir, "plugins", "cache", "marketplace1")) {
        return ["my-plugin"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      if (
        p ===
        path.join(claudeDir, "plugins", "cache", "marketplace1", "my-plugin")
      ) {
        return ["2.0.0"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      throw new Error("ENOENT");
    });

    mockFs.stat.mockImplementation(async () => {
      return { isDirectory: () => true } as Awaited<
        ReturnType<typeof fs.stat>
      >;
    });

    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getGlobalConfig } = await importConfigData();
    const config = await getGlobalConfig();

    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].enabled).toBe(false);
  });

  it("reads blocklist and marks plugins as blocked", async () => {
    const claudeDir = path.join(os.homedir(), ".claude");

    mockFs.readFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join(claudeDir, "settings.json")) {
        return JSON.stringify({ enabledPlugins: {} });
      }
      if (p === path.join(claudeDir, "plugins", "blocklist.json")) {
        return JSON.stringify({
          fetchedAt: "2026-01-01T00:00:00Z",
          plugins: [
            {
              plugin: "bad-plugin@evil-market",
              reason: "malware",
              text: "Contains malicious code",
            },
          ],
        });
      }
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p === path.join(claudeDir, "plugins", "cache")) {
        return ["evil-market"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      if (p === path.join(claudeDir, "plugins", "cache", "evil-market")) {
        return ["bad-plugin"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      if (
        p ===
        path.join(
          claudeDir,
          "plugins",
          "cache",
          "evil-market",
          "bad-plugin"
        )
      ) {
        return ["1.0.0"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      throw new Error("ENOENT");
    });

    mockFs.stat.mockImplementation(async () => {
      return { isDirectory: () => true } as Awaited<
        ReturnType<typeof fs.stat>
      >;
    });

    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getGlobalConfig } = await importConfigData();
    const config = await getGlobalConfig();

    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].blocked).toEqual({
      reason: "malware",
      text: "Contains malicious code",
    });
  });

  it("reads plugin MCP servers from .mcp.json", async () => {
    const claudeDir = path.join(os.homedir(), ".claude");
    const versionDir = path.join(
      claudeDir,
      "plugins",
      "cache",
      "mp",
      "ctx",
      "1.0.0"
    );

    mockFs.readFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join(claudeDir, "settings.json")) {
        return JSON.stringify({ enabledPlugins: {} });
      }
      if (p === path.join(versionDir, ".mcp.json")) {
        return JSON.stringify({
          mcpServers: {
            "context7-server": {
              command: "npx",
              args: ["-y", "@upstash/context7-mcp"],
              type: "stdio",
            },
          },
        });
      }
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p === path.join(claudeDir, "plugins", "cache")) {
        return ["mp"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      }
      if (p === path.join(claudeDir, "plugins", "cache", "mp")) {
        return ["ctx"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      }
      if (p === path.join(claudeDir, "plugins", "cache", "mp", "ctx")) {
        return ["1.0.0"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      throw new Error("ENOENT");
    });

    mockFs.stat.mockImplementation(async () => {
      return { isDirectory: () => true } as Awaited<
        ReturnType<typeof fs.stat>
      >;
    });

    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getGlobalConfig } = await importConfigData();
    const config = await getGlobalConfig();

    expect(config.plugins[0].mcpServers).toHaveLength(1);
    expect(config.plugins[0].mcpServers[0]).toEqual({
      name: "context7-server",
      type: "stdio",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      source: "plugin",
      pluginName: "ctx",
    });
    // Also aggregated in top-level mcpServers
    expect(config.mcpServers).toHaveLength(1);
  });

  it("reads plugin hooks from hooks.json", async () => {
    const claudeDir = path.join(os.homedir(), ".claude");
    const versionDir = path.join(
      claudeDir,
      "plugins",
      "cache",
      "mp",
      "myplugin",
      "1.0.0"
    );

    mockFs.readFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join(claudeDir, "settings.json")) {
        return JSON.stringify({ enabledPlugins: {} });
      }
      if (p === path.join(versionDir, "hooks", "hooks.json")) {
        return JSON.stringify({
          hooks: {
            SessionStart: [
              {
                hooks: [
                  { type: "command", command: "node init.js" },
                  { type: "command", command: "bun run.ts" },
                ],
              },
            ],
            PreToolUse: [
              {
                matcher: "Edit",
                hooks: [{ type: "command", command: "lint-check" }],
              },
            ],
          },
        });
      }
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p === path.join(claudeDir, "plugins", "cache")) {
        return ["mp"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      }
      if (p === path.join(claudeDir, "plugins", "cache", "mp")) {
        return ["myplugin"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      if (
        p === path.join(claudeDir, "plugins", "cache", "mp", "myplugin")
      ) {
        return ["1.0.0"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      throw new Error("ENOENT");
    });

    mockFs.stat.mockImplementation(async () => {
      return { isDirectory: () => true } as Awaited<
        ReturnType<typeof fs.stat>
      >;
    });

    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getGlobalConfig } = await importConfigData();
    const config = await getGlobalConfig();

    expect(config.hooks).toHaveLength(2);
    expect(config.hooks[0]).toEqual({
      event: "SessionStart",
      matcher: undefined,
      commands: ["node init.js", "bun run.ts"],
      pluginName: "myplugin",
    });
    expect(config.hooks[1]).toEqual({
      event: "PreToolUse",
      matcher: "Edit",
      commands: ["lint-check"],
      pluginName: "myplugin",
    });
  });

  it("picks latest version directory", async () => {
    const claudeDir = path.join(os.homedir(), ".claude");

    mockFs.readFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join(claudeDir, "settings.json")) {
        return JSON.stringify({ enabledPlugins: {} });
      }
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
      const p = String(dirPath);
      if (p === path.join(claudeDir, "plugins", "cache")) {
        return ["mp"] as unknown as Awaited<ReturnType<typeof fs.readdir>>;
      }
      if (p === path.join(claudeDir, "plugins", "cache", "mp")) {
        return ["plug"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      if (p === path.join(claudeDir, "plugins", "cache", "mp", "plug")) {
        return ["1.0.0", "2.0.0", "1.5.0"] as unknown as Awaited<
          ReturnType<typeof fs.readdir>
        >;
      }
      throw new Error("ENOENT");
    });

    mockFs.stat.mockImplementation(async () => {
      return { isDirectory: () => true } as Awaited<
        ReturnType<typeof fs.stat>
      >;
    });

    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getGlobalConfig } = await importConfigData();
    const config = await getGlobalConfig();

    // sorted: ["1.0.0", "1.5.0", "2.0.0"], last is "2.0.0"
    expect(config.plugins[0].version).toBe("2.0.0");
  });
});

describe("getProjectConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("returns empty config when project dir does not exist", async () => {
    mockFs.readFile.mockRejectedValue(new Error("ENOENT"));
    mockFs.readdir.mockRejectedValue(new Error("ENOENT"));
    mockFs.stat.mockRejectedValue(new Error("ENOENT"));
    mockFs.access.mockRejectedValue(new Error("ENOENT"));

    const { getProjectConfig } = await importConfigData();
    const config = await getProjectConfig("/nonexistent/project");

    expect(config.mcpServers).toEqual([]);
    expect(config.hasClaudeMd).toBe(false);
  });

  it("detects CLAUDE.md in project root", async () => {
    mockFs.access.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join("/my/project", "CLAUDE.md")) {
        return undefined;
      }
      throw new Error("ENOENT");
    });

    mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

    const { getProjectConfig } = await importConfigData();
    const config = await getProjectConfig("/my/project");

    expect(config.hasClaudeMd).toBe(true);
  });

  it("reads project .mcp.json servers", async () => {
    mockFs.access.mockRejectedValue(new Error("ENOENT"));
    mockFs.readFile.mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p === path.join("/my/project", ".mcp.json")) {
        return JSON.stringify({
          mcpServers: {
            "project-server": {
              command: "node",
              args: ["server.js"],
            },
          },
        });
      }
      throw new Error("ENOENT");
    });

    const { getProjectConfig } = await importConfigData();
    const config = await getProjectConfig("/my/project");

    expect(config.mcpServers).toHaveLength(1);
    expect(config.mcpServers[0]).toEqual({
      name: "project-server",
      type: undefined,
      command: "node",
      args: ["server.js"],
      source: "project",
    });
  });
});
