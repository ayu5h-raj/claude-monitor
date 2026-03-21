import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  parseJSONLContent,
  mapRawEntriesToSessionEntries,
  extractSessionMetadata,
} from "./jsonl-parser";
import { TTLCache } from "./cache";
import type {
  Session,
  SessionEntry,
  StatsData,
  Repository,
  ActiveSession,
} from "./types";
import { extractRepoName } from "./path-utils";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
const STATS_FILE = path.join(CLAUDE_DIR, "stats-cache.json");
const SESSIONS_DIR = path.join(CLAUDE_DIR, "sessions");

const sessionListCache = new TTLCache<Session[]>(30_000);
const sessionDetailCache = new TTLCache<{
  entries: SessionEntry[];
  mtime: number;
}>(300_000);

async function getActiveSessions(): Promise<Map<string, ActiveSession>> {
  const map = new Map<string, ActiveSession>();
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await fs.readFile(
          path.join(SESSIONS_DIR, file),
          "utf-8"
        );
        const session: ActiveSession = JSON.parse(content);
        map.set(session.sessionId, session);
      } catch {
        // Skip unreadable session files
      }
    }
  } catch {
    // Sessions dir may not exist
  }
  return map;
}

export async function getAllSessions(): Promise<Session[]> {
  const cached = sessionListCache.get("all");
  if (cached) return cached;

  const sessions: Session[] = [];
  const activeSessions = await getActiveSessions();

  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(PROJECTS_DIR, projectDir);
      const stat = await fs.stat(projectPath);
      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(projectPath);
      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const sessionId = file.replace(".jsonl", "");
        const filePath = path.join(projectPath, file);

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const rawEntries = parseJSONLContent(content);
          if (rawEntries.length === 0) continue;

          const meta = extractSessionMetadata(rawEntries, sessionId);
          // Skip sessions with no cwd (e.g., file-history-snapshot-only files)
          if (!meta.projectPath) continue;
          const status = activeSessions.has(sessionId) ? "active" : "completed";

          sessions.push({ ...meta, status });
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Projects dir may not exist — return empty
  }

  sessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  sessionListCache.set("all", sessions);
  return sessions;
}

export async function getSessionDetail(
  sessionId: string
): Promise<{ session: Session; entries: SessionEntry[] } | null> {
  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(PROJECTS_DIR, projectDir);
      const filePath = path.join(projectPath, `${sessionId}.jsonl`);

      try {
        const stat = await fs.stat(filePath);
        const mtime = stat.mtimeMs;

        const cached = sessionDetailCache.get(sessionId);
        if (cached && cached.mtime === mtime) {
          const rawEntries = parseJSONLContent(
            await fs.readFile(filePath, "utf-8")
          );
          const activeSessions = await getActiveSessions();
          const meta = extractSessionMetadata(rawEntries, sessionId);
          const status = activeSessions.has(sessionId) ? "active" : "completed";
          return { session: { ...meta, status }, entries: cached.entries };
        }

        const content = await fs.readFile(filePath, "utf-8");
        const rawEntries = parseJSONLContent(content);
        const entries = mapRawEntriesToSessionEntries(rawEntries);
        const meta = extractSessionMetadata(rawEntries, sessionId);
        const activeSessions = await getActiveSessions();
        const status = activeSessions.has(sessionId) ? "active" : "completed";

        sessionDetailCache.set(sessionId, { entries, mtime });

        return { session: { ...meta, status }, entries };
      } catch {
        // File doesn't exist in this project dir, try next
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function getStats(): Promise<StatsData | null> {
  try {
    const content = await fs.readFile(STATS_FILE, "utf-8");
    const raw = JSON.parse(content);
    return {
      totalSessions: raw.totalSessions || 0,
      totalMessages: raw.totalMessages || 0,
      dailyActivity: raw.dailyActivity || [],
      dailyModelTokens: raw.dailyModelTokens || [],
      modelUsage: raw.modelUsage || {},
      longestSession: raw.longestSession,
      firstSessionDate: raw.firstSessionDate,
    };
  } catch {
    return null;
  }
}

export async function getProjects(): Promise<Repository[]> {
  const sessions = await getAllSessions();
  const repoMap = new Map<string, { sessions: Session[]; path: string }>();

  for (const session of sessions) {
    const key = session.projectPath;
    if (!repoMap.has(key)) {
      repoMap.set(key, { sessions: [], path: session.projectPath });
    }
    repoMap.get(key)!.sessions.push(session);
  }

  const repos: Repository[] = [];
  for (const [, { sessions: repoSessions, path: repoPath }] of repoMap) {
    const branchMap = new Map<string, Session[]>();
    for (const s of repoSessions) {
      const branchKey = s.branch || "main";
      if (!branchMap.has(branchKey)) branchMap.set(branchKey, []);
      branchMap.get(branchKey)!.push(s);
    }

    const worktrees = Array.from(branchMap.entries()).map(
      ([branchName, branchSessions]) => ({
        name: branchName,
        sessionCount: branchSessions.length,
        lastActiveAt: branchSessions.reduce(
          (latest, s) =>
            s.lastActiveAt > latest ? s.lastActiveAt : latest,
          new Date(0)
        ),
      })
    );

    repos.push({
      name: extractRepoName(repoPath),
      path: repoPath,
      worktrees,
      sessionCount: repoSessions.length,
      lastActiveAt: repoSessions.reduce(
        (latest, s) =>
          s.lastActiveAt > latest ? s.lastActiveAt : latest,
        new Date(0)
      ),
    });
  }

  repos.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  return repos;
}

export interface FileHistoryEntry {
  filePath: string;
  sessions: Array<{
    sessionId: string;
    project: string;
    branch: string;
    lastActiveAt: string;
  }>;
}

export async function getFileHistory(): Promise<FileHistoryEntry[]> {
  const sessions = await getAllSessions();
  const fileMap = new Map<
    string,
    Array<{ sessionId: string; project: string; branch: string; lastActiveAt: string }>
  >();

  for (const session of sessions) {
    for (const filePath of session.filesChanged) {
      if (!fileMap.has(filePath)) fileMap.set(filePath, []);
      fileMap.get(filePath)!.push({
        sessionId: session.id,
        project: session.project,
        branch: session.branch,
        lastActiveAt: session.lastActiveAt.toISOString(),
      });
    }
  }

  const entries: FileHistoryEntry[] = Array.from(fileMap.entries()).map(
    ([filePath, sessions]) => ({ filePath, sessions })
  );

  // Sort by most recently modified
  entries.sort((a, b) => {
    const aLatest = a.sessions[0]?.lastActiveAt || "";
    const bLatest = b.sessions[0]?.lastActiveAt || "";
    return bLatest.localeCompare(aLatest);
  });

  return entries;
}

export interface ToolAnalytics {
  name: string;
  totalCalls: number;
  totalErrors: number;
  errorRate: number;
}

export interface ToolError {
  toolName: string;
  sessionId: string;
  project: string;
  lastActiveAt: string;
}

export async function getToolAnalytics(): Promise<{
  tools: ToolAnalytics[];
  recentErrors: ToolError[];
}> {
  const sessions = await getAllSessions();
  const aggregate: Record<string, { calls: number; errors: number }> = {};
  const recentErrors: ToolError[] = [];

  for (const session of sessions) {
    for (const [toolName, stats] of Object.entries(session.toolStats)) {
      if (!aggregate[toolName]) aggregate[toolName] = { calls: 0, errors: 0 };
      aggregate[toolName].calls += stats.calls;
      aggregate[toolName].errors += stats.errors;

      if (stats.errors > 0) {
        recentErrors.push({
          toolName,
          sessionId: session.id,
          project: session.project,
          lastActiveAt: session.lastActiveAt.toISOString(),
        });
      }
    }
  }

  const tools: ToolAnalytics[] = Object.entries(aggregate)
    .map(([name, stats]) => ({
      name,
      totalCalls: stats.calls,
      totalErrors: stats.errors,
      errorRate: stats.calls > 0 ? (stats.errors / stats.calls) * 100 : 0,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls);

  // Sort errors by most recent
  recentErrors.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));

  return { tools, recentErrors: recentErrors.slice(0, 20) };
}
