import fs from "fs/promises";
import path from "path";
import os from "os";

export interface CachedInsights {
  generatedAt: string;
  model: string;
  content: string;
}

const INSIGHTS_DIR = path.join(os.homedir(), ".claude-monitor", "insights");

function insightsPath(sessionId: string): string {
  const sanitized = path.basename(sessionId);
  return path.join(INSIGHTS_DIR, `${sanitized}.json`);
}

export async function getCachedInsights(
  sessionId: string
): Promise<CachedInsights | null> {
  try {
    const raw = await fs.readFile(insightsPath(sessionId), "utf-8");
    return JSON.parse(raw) as CachedInsights;
  } catch {
    return null;
  }
}

export async function saveCachedInsights(
  sessionId: string,
  data: CachedInsights
): Promise<void> {
  await fs.mkdir(INSIGHTS_DIR, { recursive: true });
  await fs.writeFile(insightsPath(sessionId), JSON.stringify(data, null, 2), "utf-8");
}
