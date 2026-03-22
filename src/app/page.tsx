export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { SidebarPlaceholder, SessionListPlaceholder } from "@/src/components/terminal-loader";
import { getProjects } from "@/lib/claude-data";
import AsyncSidebar from "@/src/components/async-sidebar";
import AsyncSessionList from "@/src/components/async-session-list";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; branch?: string; bookmarked?: string; tag?: string; q?: string }>;
}) {
  const { repo, branch, bookmarked, tag, q } = await searchParams;

  // Lightweight fetch for repo names (needed by AsyncSessionList for display)
  const repos = await getProjects();
  const serializedRepos = repos.map((r) => ({ name: r.name, path: r.path }));

  return (
    <div style={{ display: "flex", height: "calc(100vh - 45px)", overflow: "hidden" }}>
      <Suspense fallback={<SidebarPlaceholder />}>
        <AsyncSidebar
          selectedRepo={repo}
          selectedBranch={branch}
          selectedTag={tag}
          showBookmarked={bookmarked === "true"}
        />
      </Suspense>

      {/* Drag handle for sidebar resize */}
      <div id="sidebar-drag" style={{ width: "5px", cursor: "col-resize", background: "var(--border)", flexShrink: 0 }} />

      <Suspense fallback={<SessionListPlaceholder />}>
        <AsyncSessionList
          selectedRepo={repo}
          selectedBranch={branch}
          showBookmarked={bookmarked === "true"}
          selectedTag={tag}
          searchQuery={q}
          repos={serializedRepos}
        />
      </Suspense>
    </div>
  );
}
