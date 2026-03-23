import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR, getActiveSessions } from "./claude-data";

export function getNewLines(content: string, baselineCount: number): string[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length <= baselineCount) return [];
  return lines.slice(baselineCount);
}

export async function isSessionActive(sessionId: string): Promise<boolean> {
  try {
    const filePath = await findSessionFile(sessionId);
    if (!filePath) return false;
    const fileStat = await fs.stat(filePath);
    // Read first line to extract cwd
    const content = await fs.readFile(filePath, "utf-8");
    const firstLine = content.slice(0, content.indexOf("\n") || content.length);
    const entry = JSON.parse(firstLine);
    if (!entry.cwd) return false;
    const activeSessions = await getActiveSessions();
    const active = activeSessions.get(entry.cwd);
    return !!(active && fileStat.mtimeMs >= active.startedAt);
  } catch {
    return false;
  }
}

export async function findSessionFile(sessionId: string): Promise<string | null> {
  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);
    for (const dir of projectDirs) {
      const dirPath = path.join(PROJECTS_DIR, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (!stat.isDirectory()) continue;
      } catch {
        continue;
      }
      const filePath = path.join(dirPath, `${sessionId}.jsonl`);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // Not in this dir
      }
    }
  } catch {
    // PROJECTS_DIR may not exist
  }
  return null;
}
