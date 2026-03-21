export const dynamic = "force-dynamic";

import { getFileHistory } from "@/lib/claude-data";
import FileSearch from "@/src/components/file-search";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const files = await getFileHistory();

  return <FileSearch files={files} initialQuery={q || ""} />;
}
