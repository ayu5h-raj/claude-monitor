export const dynamic = "force-dynamic";

import { getAllSessions, getProjects, getStats } from "@/lib/claude-data";
import { getAllSessionMetadata } from "@/lib/session-metadata";
import { searchSessions } from "@/lib/search";
import SessionList from "@/src/components/session-list";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; branch?: string; bookmarked?: string; tag?: string; q?: string }>;
}) {
  const { repo, branch, bookmarked, tag, q } = await searchParams;

  const [sessions, repos, stats, allMetadata] = await Promise.all([
    getAllSessions(),
    getProjects(),
    getStats(),
    getAllSessionMetadata(),
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
  if (bookmarked === "true") {
    filtered = filtered.filter((s) => allMetadata[s.id]?.bookmarked === true);
  }
  if (tag) {
    filtered = filtered.filter((s) => allMetadata[s.id]?.tags?.includes(tag));
  }

  // Search
  const searchResults = q
    ? await searchSessions(q, {
        repo: repo || undefined,
        branch: branch || undefined,
        bookmarked: bookmarked === "true" || undefined,
        tag: tag || undefined,
      })
    : undefined;

  // Compute sidebar metadata
  const bookmarkCount = Object.values(allMetadata).filter((m) => m.bookmarked).length;
  const tagCountMap = new Map<string, number>();
  for (const meta of Object.values(allMetadata)) {
    for (const t of meta.tags || []) {
      tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1);
    }
  }
  const tagCounts = Array.from(tagCountMap.entries())
    .map(([t, count]) => ({ tag: t, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return (
    <SessionList
      sessions={filtered}
      repos={serializedRepos}
      selectedRepo={repo}
      selectedBranch={branch}
      todayStats={todayStats}
      allMetadata={allMetadata}
      bookmarkCount={bookmarkCount}
      tagCounts={tagCounts}
      selectedTag={tag}
      showBookmarked={bookmarked === "true"}
      searchQuery={q}
      searchResults={searchResults}
    />
  );
}
