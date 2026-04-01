import { TTLCache } from "@/lib/cache";
import { isNewerVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

interface ReleaseInfo {
  latestVersion: string;
  htmlUrl: string;
}

const releaseCache = new TTLCache<ReleaseInfo>(60 * 60 * 1000); // 1 hour

export async function GET() {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

  try {
    const release = await releaseCache.getOrSet("latest", async () => {
      const res = await fetch(
        "https://api.github.com/repos/ayu5h-raj/claude-monitor/releases/latest",
        { headers: { Accept: "application/vnd.github.v3+json" } }
      );
      if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
      const data = await res.json();
      return {
        latestVersion: data.tag_name as string,
        htmlUrl: data.html_url as string,
      };
    });

    return Response.json({
      currentVersion,
      latestVersion: release.latestVersion,
      updateAvailable: isNewerVersion(currentVersion, release.latestVersion),
      releaseUrl: release.htmlUrl,
    });
  } catch {
    return Response.json({
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
    });
  }
}
