import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR, SESSIONS_DIR } from "./claude-data";

export function getNewLines(content: string, baselineCount: number): string[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length <= baselineCount) return [];
  return lines.slice(baselineCount);
}

export async function isSessionActive(sessionId: string): Promise<boolean> {
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await fs.readFile(path.join(SESSIONS_DIR, file), "utf-8");
        const data = JSON.parse(content);
        if (data.sessionId === sessionId) return true;
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Sessions dir may not exist
  }
  return false;
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
