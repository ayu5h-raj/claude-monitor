import fs from "fs/promises";
import path from "path";
import os from "os";
import { TTLCache } from "./cache";
import type {
  GlobalConfig,
  PluginInfo,
  SkillInfo,
  McpServerInfo,
  CommandInfo,
  HookInfo,
} from "./types";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");
const PLUGINS_CACHE_DIR = path.join(CLAUDE_DIR, "plugins", "cache");
const BLOCKLIST_FILE = path.join(CLAUDE_DIR, "plugins", "blocklist.json");
const GLOBAL_SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
const GLOBAL_COMMANDS_DIR = path.join(CLAUDE_DIR, "commands");

const configCache = new TTLCache<GlobalConfig>(30_000);
const projectConfigCache = new TTLCache<{
  mcpServers: McpServerInfo[];
  hasClaudeMd: boolean;
}>(30_000);

// ─── Helpers ────────────────────────────────────────────────────

async function getLatestVersion(pluginDir: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(pluginDir);
    if (entries.length === 0) return null;
    entries.sort();
    return entries[entries.length - 1];
  } catch {
    return null;
  }
}

function parseFrontmatter(
  content: string
): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) fm[key] = value;
  }
  return fm;
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// ─── Plugin scanning ────────────────────────────────────────────

async function readPluginMcpServers(
  versionDir: string,
  pluginName: string
): Promise<McpServerInfo[]> {
  const mcpPath = path.join(versionDir, ".mcp.json");
  const raw = await readJsonSafe<Record<string, unknown>>(mcpPath);
  if (!raw) return [];

  // Handle both { "name": {...} } and { "mcpServers": { "name": {...} } }
  const serversObj =
    (raw.mcpServers as Record<string, Record<string, unknown>> | undefined) ??
    (raw as Record<string, Record<string, unknown>>);

  const servers: McpServerInfo[] = [];
  for (const [name, cfg] of Object.entries(serversObj)) {
    if (!cfg || typeof cfg !== "object") continue;
    // Skip the mcpServers key if it was used as wrapper
    if (name === "mcpServers") continue;
    servers.push({
      name,
      type: (cfg.type as string) || undefined,
      command: (cfg.command as string) || "",
      args: (cfg.args as string[]) || [],
      source: "plugin",
      pluginName,
    });
  }
  return servers;
}

async function readPluginHooks(
  versionDir: string,
  pluginName: string
): Promise<HookInfo[]> {
  const hooksPath = path.join(versionDir, "hooks", "hooks.json");
  const raw = await readJsonSafe<{
    hooks: Record<
      string,
      Array<{
        matcher?: string;
        hooks: Array<{ type: string; command: string }>;
      }>
    >;
  }>(hooksPath);
  if (!raw?.hooks) return [];

  const result: HookInfo[] = [];
  for (const [event, entries] of Object.entries(raw.hooks)) {
    for (const entry of entries) {
      const commands = entry.hooks.map((h) => h.command);
      if (commands.length > 0) {
        result.push({
          event,
          matcher: entry.matcher,
          commands,
          pluginName,
        });
      }
    }
  }
  return result;
}

async function readPluginSkills(
  versionDir: string,
  pluginName: string
): Promise<SkillInfo[]> {
  const skillsDir = path.join(versionDir, "skills");
  try {
    const entries = await fs.readdir(skillsDir);
    const skills: SkillInfo[] = [];
    for (const entry of entries) {
      const entryPath = path.join(skillsDir, entry);
      const stat = await fs.stat(entryPath);
      if (!stat.isDirectory()) continue;

      // Try SKILL.md first, then CLAUDE.md
      let content: string | null = null;
      try {
        content = await fs.readFile(
          path.join(entryPath, "SKILL.md"),
          "utf-8"
        );
      } catch {
        try {
          content = await fs.readFile(
            path.join(entryPath, "CLAUDE.md"),
            "utf-8"
          );
        } catch {
          // No skill file found
        }
      }

      if (!content) continue;
      const fm = parseFrontmatter(content);
      const skill: SkillInfo = {
        name: fm?.name || entry,
        description: fm?.description,
        source: "plugin",
        pluginName,
      };
      if (fm?.["allowed-tools"]) {
        skill.allowedTools = fm["allowed-tools"]
          .split(",")
          .map((s) => s.trim());
      }
      skills.push(skill);
    }
    return skills;
  } catch {
    return [];
  }
}

async function readCommands(
  dir: string,
  source: "global" | "plugin",
  pluginName?: string
): Promise<CommandInfo[]> {
  try {
    const files = await fs.readdir(dir);
    const commands: CommandInfo[] = [];
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      try {
        const content = await fs.readFile(path.join(dir, file), "utf-8");
        const preview = content.slice(0, 200).replace(/\n/g, " ").trim();
        commands.push({
          name: file.replace(/\.md$/, ""),
          filename: file,
          source,
          pluginName,
          preview,
        });
      } catch {
        // Skip unreadable command files
      }
    }
    return commands;
  } catch {
    return [];
  }
}

async function readPluginDescription(
  versionDir: string
): Promise<string | undefined> {
  const pluginJsonPath = path.join(
    versionDir,
    ".claude-plugin",
    "plugin.json"
  );
  const raw = await readJsonSafe<{ description?: string }>(pluginJsonPath);
  return raw?.description;
}

async function readGlobalSkills(): Promise<SkillInfo[]> {
  try {
    const entries = await fs.readdir(GLOBAL_SKILLS_DIR);
    const skills: SkillInfo[] = [];
    for (const entry of entries) {
      const entryPath = path.join(GLOBAL_SKILLS_DIR, entry);
      const stat = await fs.stat(entryPath);
      if (!stat.isDirectory()) continue;

      let content: string | null = null;
      try {
        content = await fs.readFile(
          path.join(entryPath, "SKILL.md"),
          "utf-8"
        );
      } catch {
        // No SKILL.md
      }

      if (!content) continue;
      const fm = parseFrontmatter(content);
      const skill: SkillInfo = {
        name: fm?.name || entry,
        description: fm?.description,
        source: "global",
      };
      if (fm?.["allowed-tools"]) {
        skill.allowedTools = fm["allowed-tools"]
          .split(",")
          .map((s) => s.trim());
      }
      skills.push(skill);
    }
    return skills;
  } catch {
    return [];
  }
}

// ─── Main exports ───────────────────────────────────────────────

export async function getGlobalConfig(): Promise<GlobalConfig> {
  return configCache.getOrSet("global", async () => {
    const empty: GlobalConfig = {
      plugins: [],
      skills: [],
      mcpServers: [],
      commands: [],
      hooks: [],
    };

    // Read settings to determine enabled plugins
    const settings = await readJsonSafe<{
      enabledPlugins?: Record<string, boolean>;
    }>(SETTINGS_FILE);
    const enabledPlugins = settings?.enabledPlugins ?? {};

    // Read blocklist
    const blocklist = await readJsonSafe<{
      fetchedAt?: string;
      plugins?: Array<{ plugin: string; reason: string; text: string }>;
    }>(BLOCKLIST_FILE);
    const blockMap = new Map<string, { reason: string; text: string }>();
    if (blocklist?.plugins) {
      for (const entry of blocklist.plugins) {
        blockMap.set(entry.plugin, {
          reason: entry.reason,
          text: entry.text,
        });
      }
    }

    // Scan plugin cache directory: cache/<marketplace>/<pluginName>/<version>/
    const plugins: PluginInfo[] = [];
    try {
      const marketplaces = await fs.readdir(PLUGINS_CACHE_DIR);
      for (const marketplace of marketplaces) {
        const marketplacePath = path.join(PLUGINS_CACHE_DIR, marketplace);
        try {
          const stat = await fs.stat(marketplacePath);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }

        let pluginNames: string[];
        try {
          pluginNames = await fs.readdir(marketplacePath);
        } catch {
          continue;
        }

        for (const pluginName of pluginNames) {
          const pluginDir = path.join(marketplacePath, pluginName);
          try {
            const stat = await fs.stat(pluginDir);
            if (!stat.isDirectory()) continue;
          } catch {
            continue;
          }

          const version = await getLatestVersion(pluginDir);
          if (!version) continue;

          const versionDir = path.join(pluginDir, version);
          const key = `${pluginName}@${marketplace}`;

          const [description, mcpServers, hooks, skills, commands] =
            await Promise.all([
              readPluginDescription(versionDir),
              readPluginMcpServers(versionDir, pluginName),
              readPluginHooks(versionDir, pluginName),
              readPluginSkills(versionDir, pluginName),
              readCommands(
                path.join(versionDir, "commands"),
                "plugin",
                pluginName
              ),
            ]);

          const plugin: PluginInfo = {
            name: pluginName,
            marketplace,
            version,
            enabled: enabledPlugins[key] === true,
            description,
            mcpServers,
            hooks,
            skills,
            commands,
          };

          const blockEntry = blockMap.get(key);
          if (blockEntry) {
            plugin.blocked = blockEntry;
          }

          plugins.push(plugin);
        }
      }
    } catch {
      // Plugins cache dir may not exist
    }

    // Aggregate from plugins
    const allMcpServers: McpServerInfo[] = [];
    const allHooks: HookInfo[] = [];
    const allCommands: CommandInfo[] = [];
    for (const plugin of plugins) {
      allMcpServers.push(...plugin.mcpServers);
      allHooks.push(...plugin.hooks);
      allCommands.push(...plugin.commands);
    }

    // Global skills
    const globalSkills = await readGlobalSkills();

    // Global commands
    const globalCommands = await readCommands(GLOBAL_COMMANDS_DIR, "global");
    allCommands.push(...globalCommands);

    return {
      plugins,
      skills: globalSkills,
      mcpServers: allMcpServers,
      commands: allCommands,
      hooks: allHooks,
    };
  });
}

export async function getProjectConfig(
  cwd: string
): Promise<{ mcpServers: McpServerInfo[]; hasClaudeMd: boolean }> {
  return projectConfigCache.getOrSet(cwd, async () => {
    const empty = { mcpServers: [] as McpServerInfo[], hasClaudeMd: false };
    try {
      // Check for .claude/CLAUDE.md or CLAUDE.md in project root
      let hasClaudeMd = false;
      try {
        await fs.access(path.join(cwd, "CLAUDE.md"));
        hasClaudeMd = true;
      } catch {
        try {
          await fs.access(path.join(cwd, ".claude", "CLAUDE.md"));
          hasClaudeMd = true;
        } catch {
          // No CLAUDE.md
        }
      }

      // Read project-level MCP config
      const mcpServers: McpServerInfo[] = [];
      const mcpPath = path.join(cwd, ".mcp.json");
      const raw = await readJsonSafe<Record<string, unknown>>(mcpPath);
      if (raw) {
        const serversObj =
          (raw.mcpServers as
            | Record<string, Record<string, unknown>>
            | undefined) ??
          (raw as Record<string, Record<string, unknown>>);

        for (const [name, cfg] of Object.entries(serversObj)) {
          if (!cfg || typeof cfg !== "object") continue;
          if (name === "mcpServers") continue;
          mcpServers.push({
            name,
            type: (cfg.type as string) || undefined,
            command: (cfg.command as string) || "",
            args: (cfg.args as string[]) || [],
            source: "project",
          });
        }
      }

      return { mcpServers, hasClaudeMd };
    } catch {
      return empty;
    }
  });
}
