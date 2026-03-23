import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  parseJSONLContent,
  mapRawEntriesToSessionEntries,
  extractSessionMetadata,
  inferActiveState,
} from "./jsonl-parser";
import { TTLCache } from "./cache";
import type {
  Session,
  SessionEntry,
  StatsData,
  DailyActivity,
  Repository,
  ActiveSession,
  CodeImpact,
} from "./types";
import { extractRepoName } from "./path-utils";
import { extractCodeImpact } from "./code-impact";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
export const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
const STATS_FILE = path.join(CLAUDE_DIR, "stats-cache.json");
export const SESSIONS_DIR = path.join(CLAUDE_DIR, "sessions");

const sessionListCache = new TTLCache<Session[]>(30_000);
const sessionDetailCache = new TTLCache<{
  entries: SessionEntry[];
  mtime: number;
}>(600_000);

// Deduplication map for concurrent getSessionDetail calls
const inFlightDetailRequests = new Map<string, Promise<{ session: Session; entries: SessionEntry[]; codeImpact: CodeImpact } | null>>();

// Returns active sessions keyed by cwd (project path), with PID liveness validation
// Multiple active sessions can exist per cwd (e.g., two Claude terminals in same dir)
export async function getActiveSessions(): Promise<Map<string, ActiveSession[]>> {
  const map = new Map<string, ActiveSession[]>();
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
        // Validate PID is alive
        try {
          process.kill(session.pid, 0);
        } catch {
          continue; // Process is dead, skip
        }
        const existing = map.get(session.cwd) || [];
        existing.push(session);
        map.set(session.cwd, existing);
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
      const dirStat = await fs.stat(projectPath);
      if (!dirStat.isDirectory()) continue;

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
          if (!meta.projectPath) continue;

          // Check if this JSONL is being actively written to by any Claude process
          const activeList = activeSessions.get(meta.projectPath);
          let status: "active" | "completed" = "completed";
          let activeState: "working" | "waiting" | "thinking" | "idle" | undefined;
          if (activeList && activeList.length > 0) {
            const fileStat = await fs.stat(filePath);
            // Active if mtime >= any active session's startedAt for this cwd
            const earliestStart = Math.min(...activeList.map(s => s.startedAt));
            if (fileStat.mtimeMs >= earliestStart) {
              status = "active";
              activeState = inferActiveState(rawEntries);
            }
          }

          sessions.push({ ...meta, status, activeState });
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
): Promise<{ session: Session; entries: SessionEntry[]; codeImpact: CodeImpact } | null> {
  // Return existing in-flight request if one exists (deduplication)
  const existing = inFlightDetailRequests.get(sessionId);
  if (existing) return existing;

  const promise = (async () => {
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
            const activeList = activeSessions.get(meta.projectPath);
            const earliestStart = activeList?.length ? Math.min(...activeList.map(s => s.startedAt)) : Infinity;
            const status: "active" | "completed" = (activeList?.length && stat.mtimeMs >= earliestStart) ? "active" : "completed";
            const activeState = status === "active" ? inferActiveState(rawEntries) : undefined;
            const codeImpact = extractCodeImpact(rawEntries);
            return { session: { ...meta, status, activeState }, entries: cached.entries, codeImpact };
          }

          const content = await fs.readFile(filePath, "utf-8");
          const rawEntries = parseJSONLContent(content);
          const entries = mapRawEntriesToSessionEntries(rawEntries);
          const meta = extractSessionMetadata(rawEntries, sessionId);
          const activeSessions = await getActiveSessions();
          const activeSessArr = activeSessions.get(meta.projectPath);
          const status: "active" | "completed" = (activeSessArr && activeSessArr.some(s => stat.mtimeMs >= s.startedAt)) ? "active" : "completed";
          const activeState = status === "active" ? inferActiveState(rawEntries) : undefined;

          sessionDetailCache.set(sessionId, { entries, mtime });
          const codeImpact = extractCodeImpact(rawEntries);

          return { session: { ...meta, status, activeState }, entries, codeImpact };
        } catch {
          // File doesn't exist in this project dir, try next
        }
      }
    } catch {
      return null;
    }

    return null;
  })();

  inFlightDetailRequests.set(sessionId, promise);
  try {
    return await promise;
  } finally {
    inFlightDetailRequests.delete(sessionId);
  }
}

export async function getStats(): Promise<StatsData | null> {
  let cached: Record<string, unknown> | null = null;
  try {
    const content = await fs.readFile(STATS_FILE, "utf-8");
    cached = JSON.parse(content);
  } catch {
    // Cache file missing or unreadable
  }

  const sessions = await getAllSessions();
  if (!cached && sessions.length === 0) return null;

  // Compute dailyActivity from live session data
  const liveDaily = new Map<string, DailyActivity>();
  for (const s of sessions) {
    const dateStr = s.startedAt.toISOString().slice(0, 10);
    const existing = liveDaily.get(dateStr);
    if (existing) {
      existing.sessionCount += 1;
      existing.messageCount += s.messageCount;
      existing.toolCallCount += s.toolCallCount;
    } else {
      liveDaily.set(dateStr, {
        date: dateStr,
        sessionCount: 1,
        messageCount: s.messageCount,
        toolCallCount: s.toolCallCount,
      });
    }
  }

  // Merge with cache data (keep max per day to preserve data from deleted sessions)
  const cachedDaily: DailyActivity[] =
    (cached?.dailyActivity as DailyActivity[]) || [];
  const merged = new Map<string, DailyActivity>(liveDaily);
  for (const day of cachedDaily) {
    const live = merged.get(day.date);
    if (!live) {
      merged.set(day.date, day);
    } else {
      // Keep whichever has more activity (cache may have data from deleted sessions)
      const liveTotal =
        live.sessionCount + live.messageCount + live.toolCallCount;
      const cachedTotal =
        day.sessionCount + day.messageCount + day.toolCallCount;
      if (cachedTotal > liveTotal) {
        merged.set(day.date, day);
      }
    }
  }

  const dailyActivity = Array.from(merged.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    totalSessions: Math.max(sessions.length, (cached?.totalSessions as number) || 0),
    totalMessages: Math.max(
      sessions.reduce((sum, s) => sum + s.messageCount, 0),
      (cached?.totalMessages as number) || 0
    ),
    dailyActivity,
    dailyModelTokens: (cached?.dailyModelTokens as StatsData["dailyModelTokens"]) || [],
    modelUsage: (cached?.modelUsage as StatsData["modelUsage"]) || {},
    longestSession: cached?.longestSession as StatsData["longestSession"],
    firstSessionDate: cached?.firstSessionDate as string | undefined,
  };
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
