export const dynamic = "force-dynamic";

import { getFileHistory, getProjects } from "@/lib/claude-data";
import FileSearch from "@/src/components/file-search";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; repo?: string }>;
}) {
  const { q, repo } = await searchParams;
  const [files, projects] = await Promise.all([getFileHistory(), getProjects()]);

  const repoNames = projects.map((p) => p.name);

  return (
    <FileSearch
      files={files}
      repoNames={repoNames}
      initialQuery={q || ""}
      initialRepo={repo || ""}
    />
  );
}
