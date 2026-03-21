"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();
  const isStats = pathname === "/stats";
  const isFiles = pathname === "/files";
  const isSessions = !isStats && !isFiles;

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
        <span style={{ color: "var(--text-muted)" }}>v0.1.0</span>
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
      </div>
    </nav>
  );
}
