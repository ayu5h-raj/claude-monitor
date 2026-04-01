"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function Nav() {
  const pathname = usePathname();
  const [updateInfo, setUpdateInfo] = useState<{
    latestVersion: string;
    releaseUrl: string;
  } | null>(null);

  const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === "true";

  useEffect(() => {
    if (!isDesktop) return;

    let cancelled = false;

    async function checkVersion() {
      try {
        const res = await fetch("/api/version");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.updateAvailable) {
          setUpdateInfo({
            latestVersion: data.latestVersion,
            releaseUrl: data.releaseUrl,
          });
        }
      } catch {
        // Silently ignore
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isDesktop]);
  const isStats = pathname === "/stats";
  const isFiles = pathname === "/files";
  const isTools = pathname === "/tools";
  const isConfig = pathname === "/config";
  const isNew = pathname?.startsWith("/terminal/new");
  const isSessions = !isStats && !isFiles && !isTools && !isConfig && !isNew;

  return (
    <nav
      style={{
        background: "var(--bg-tertiary)",
        borderBottom: "1px solid var(--border)",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/"
          style={{
            color: "var(--green)",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          &#9608; claude-monitor
        </Link>
        <span style={{ color: "var(--text-muted)" }}>
          v{process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0"}
        </span>
        {updateInfo && (
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--amber)",
              fontSize: "11px",
              border: "1px solid var(--amber)",
              borderRadius: "3px",
              padding: "1px 6px",
              textDecoration: "none",
              animation: "pulse-update 2s ease-in-out infinite",
            }}
            title={`Update to ${updateInfo.latestVersion}`}
          >
            {updateInfo.latestVersion} available
          </a>
        )}
      </div>
      <div style={{ display: "flex", gap: "16px" }}>
        <Link href="/">
          <span style={{ color: "var(--text-muted)" }}>[</span>
          <span
            style={{
              color: isSessions ? "var(--green)" : "var(--text-secondary)",
            }}
          >
            Sessions
          </span>
          <span style={{ color: "var(--text-muted)" }}>]</span>
        </Link>
        <Link href="/stats">
          <span style={{ color: "var(--text-muted)" }}>[</span>
          <span
            style={{
              color: isStats ? "var(--green)" : "var(--text-secondary)",
            }}
          >
            Stats
          </span>
          <span style={{ color: "var(--text-muted)" }}>]</span>
        </Link>
        <Link href="/files">
          <span style={{ color: "var(--text-muted)" }}>[</span>
          <span
            style={{
              color: isFiles ? "var(--green)" : "var(--text-secondary)",
            }}
          >
            Files
          </span>
          <span style={{ color: "var(--text-muted)" }}>]</span>
        </Link>
        <Link href="/tools">
          <span style={{ color: "var(--text-muted)" }}>[</span>
          <span
            style={{
              color: isTools ? "var(--green)" : "var(--text-secondary)",
            }}
          >
            Tools
          </span>
          <span style={{ color: "var(--text-muted)" }}>]</span>
        </Link>
        <Link href="/config">
          <span style={{ color: "var(--text-muted)" }}>[</span>
          <span
            style={{
              color: isConfig ? "var(--green)" : "var(--text-secondary)",
            }}
          >
            Config
          </span>
          <span style={{ color: "var(--text-muted)" }}>]</span>
        </Link>
        <button
          data-open-new-session=""
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "inherit",
            padding: 0,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>[</span>
          <span
            style={{
              color: isNew ? "var(--green)" : "var(--text-secondary)",
            }}
          >
            + New
          </span>
          <span style={{ color: "var(--text-muted)" }}>]</span>
        </button>
      </div>
    </nav>
  );
}
