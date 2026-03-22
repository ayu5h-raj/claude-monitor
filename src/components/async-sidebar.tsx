import { getProjects, getStats } from "@/lib/claude-data";
import { getAllSessionMetadata } from "@/lib/session-metadata";
import Sidebar from "@/src/components/sidebar";

interface AsyncSidebarProps {
  selectedRepo?: string;
  selectedBranch?: string;
  selectedTag?: string;
  showBookmarked?: boolean;
}

export default async function AsyncSidebar({
  selectedRepo,
  selectedBranch,
  selectedTag,
  showBookmarked,
}: AsyncSidebarProps) {
  const [repos, allMetadata, stats] = await Promise.all([
    getProjects(),
    getAllSessionMetadata(),
    getStats(),
  ]);

  const serializedRepos = repos.map((r) => ({
    ...r,
    lastActiveAt: r.lastActiveAt.toISOString(),
    worktrees: r.worktrees.map((wt) => ({
      ...wt,
      lastActiveAt: wt.lastActiveAt.toISOString(),
    })),
  }));

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayActivity = stats?.dailyActivity.find((d) => d.date === todayStr);
  const todayModelTokens = stats?.dailyModelTokens.find((d) => d.date === todayStr);
  const todayTokens = todayModelTokens
    ? Object.values(todayModelTokens.tokensByModel).reduce((a, b) => a + b, 0)
    : 0;

  const todayStats = {
    sessions: todayActivity?.sessionCount ?? 0,
    tokens: todayTokens,
    toolCalls: todayActivity?.toolCallCount ?? 0,
  };

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
    <Sidebar
      repos={serializedRepos}
      selectedRepo={selectedRepo}
      selectedBranch={selectedBranch}
      todayStats={todayStats}
      bookmarkCount={bookmarkCount}
      tagCounts={tagCounts}
      selectedTag={selectedTag}
      showBookmarked={showBookmarked}
    />
  );
}
