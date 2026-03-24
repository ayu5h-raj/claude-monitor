import { execSync } from "child_process";
import fs from "fs";
import { TTLCache } from "./cache";
import type { SessionCommit } from "./types";

const commitCache = new TTLCache<SessionCommit[]>(600_000); // 10 min

export function getSessionCommits(
  projectPath: string,
  startedAt: string,
  lastActiveAt: string
): SessionCommit[] {
  const cacheKey = `${projectPath}:${startedAt}:${lastActiveAt}`;
  const cached = commitCache.get(cacheKey);
  if (cached) return cached;

  try {
    if (!fs.existsSync(projectPath)) return [];

    // Add 5 minute buffer after session end
    const endDate = new Date(new Date(lastActiveAt).getTime() + 5 * 60 * 1000).toISOString();

    const logOutput = execSync(
      `git log --after="${startedAt}" --before="${endDate}" --format="%H|%h|%s|%aI|%an" --no-merges`,
      { cwd: projectPath, encoding: "utf-8", timeout: 10_000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (!logOutput) {
      commitCache.set(cacheKey, []);
      return [];
    }

    const commits: SessionCommit[] = logOutput.split("\n").map((line) => {
      const [hash, shortHash, subject, date, author] = line.split("|");
      let filesChanged = 0;
      let insertions = 0;
      let deletions = 0;

      try {
        const statOutput = execSync(
          `git diff --shortstat ${hash}^..${hash}`,
          { cwd: projectPath, encoding: "utf-8", timeout: 5_000, stdio: ["pipe", "pipe", "pipe"] }
        ).trim();

        const filesMatch = statOutput.match(/(\d+) files? changed/);
        const insMatch = statOutput.match(/(\d+) insertions?/);
        const delMatch = statOutput.match(/(\d+) deletions?/);
        if (filesMatch) filesChanged = parseInt(filesMatch[1]);
        if (insMatch) insertions = parseInt(insMatch[1]);
        if (delMatch) deletions = parseInt(delMatch[1]);
      } catch {
        // First commit or stat failed — skip stats
      }

      let patch = "";
      try {
        const raw = execSync(
          `git show --format="" --patch ${hash}`,
          { cwd: projectPath, encoding: "utf-8", timeout: 5_000, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1024 * 512 }
        );
        patch = raw.length > 20_000 ? raw.slice(0, 20_000) + "\n... (truncated)" : raw;
      } catch {
        // patch fetch failed
      }

      return { hash, shortHash, subject, date, author, filesChanged, insertions, deletions, patch };
    });

    commitCache.set(cacheKey, commits);
    return commits;
  } catch {
    return [];
  }
}
