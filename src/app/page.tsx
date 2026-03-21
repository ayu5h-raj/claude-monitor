export const dynamic = "force-dynamic";

import { getAllSessions, getProjects, getStats } from "@/lib/claude-data";
import SessionList from "@/src/components/session-list";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; branch?: string }>;
}) {
  const { repo, branch } = await searchParams;

  const [sessions, repos, stats] = await Promise.all([
    getAllSessions(),
    getProjects(),
    getStats(),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayActivity = stats?.dailyActivity.find((d) => d.date === todayStr);
  const todayModelTokens = stats?.dailyModelTokens.find(
    (d) => d.date === todayStr
  );
  const todayTokens = todayModelTokens
    ? Object.values(todayModelTokens.tokensByModel).reduce((a, b) => a + b, 0)
    : 0;

  const todayStats = {
    sessions: todayActivity?.sessionCount ?? 0,
    tokens: todayTokens,
    toolCalls: todayActivity?.toolCallCount ?? 0,
  };

  // Serialize dates
  const serializedSessions = sessions.map((s) => ({
    ...s,
    startedAt: s.startedAt.toISOString(),
    lastActiveAt: s.lastActiveAt.toISOString(),
  }));

  const serializedRepos = repos.map((r) => ({
    ...r,
    lastActiveAt: r.lastActiveAt.toISOString(),
    worktrees: r.worktrees.map((wt) => ({
      ...wt,
      lastActiveAt: wt.lastActiveAt.toISOString(),
    })),
  }));

  // Filter server-side based on URL search params
  let filtered = serializedSessions;
  if (repo) {
    filtered = filtered.filter((s) => s.projectPath === repo);
  }
  if (branch) {
    filtered = filtered.filter((s) => s.branch === branch);
  }

  return (
    <SessionList
      sessions={filtered}
      repos={serializedRepos}
      selectedRepo={repo}
      selectedBranch={branch}
      todayStats={todayStats}
    />
  );
}
