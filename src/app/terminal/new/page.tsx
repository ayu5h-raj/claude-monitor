import Link from "next/link";
import { getProjects } from "@/lib/claude-data";
import Terminal from "@/src/components/terminal";

export default async function NewTerminalPage(props: {
  searchParams: Promise<{ cwd?: string }>;
}) {
  const { cwd } = await props.searchParams;

  if (!cwd) {
    return (
      <div
        style={{
          height: "calc(100vh - 45px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ color: "var(--red)", fontSize: "13px" }}>
          Missing cwd parameter.
        </div>
        <Link
          href="/"
          style={{ color: "var(--green)", fontSize: "12px" }}
        >
          &larr; Dashboard
        </Link>
      </div>
    );
  }

  // Validate cwd against known projects
  const repos = await getProjects();
  const repo = repos.find((r) => r.path === cwd);

  if (!repo) {
    return (
      <div
        style={{
          height: "calc(100vh - 45px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ color: "var(--red)", fontSize: "13px" }}>
          Unknown project: {cwd}
        </div>
        <Link
          href="/"
          style={{ color: "var(--green)", fontSize: "12px" }}
        >
          &larr; Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "calc(100vh - 45px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Slim header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "6px 16px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          minHeight: "32px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            textDecoration: "none",
          }}
        >
          &larr; Dashboard
        </Link>
        <span
          style={{
            color: "var(--border)",
            fontSize: "11px",
          }}
        >
          |
        </span>
        <span
          style={{
            color: "var(--green)",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {repo.name}
        </span>
        <span
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "var(--green)",
            boxShadow: "0 0 6px var(--green)",
          }}
          className="live-dot"
        />
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "10px",
            marginLeft: "auto",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "400px",
            direction: "rtl",
            textAlign: "left",
          }}
        >
          {cwd}
        </span>
      </div>

      {/* Full-height terminal */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Terminal cwd={cwd} />
      </div>
    </div>
  );
}
