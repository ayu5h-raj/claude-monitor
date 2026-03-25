import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionDetail } from "@/lib/claude-data";
import { getSessionMetadata } from "@/lib/session-metadata";
import { IdeSidebarPlaceholder, ConversationPlaceholder, DockPlaceholder } from "@/src/components/terminal-loader";
import { BookmarkButton } from "@/src/components/bookmark-button";
import AsyncIdeSidebar from "@/src/components/async-ide-sidebar";
import AsyncConversation from "@/src/components/async-conversation";
import AsyncDiffViewer from "@/src/components/async-diff-viewer";
import AsyncCommitLinks from "@/src/components/async-commit-links";
import AsyncPRLinks from "@/src/components/async-pr-links";
import AsyncPlanViewer from "@/src/components/async-plan-viewer";
import AsyncTerminalDock from "@/src/components/async-terminal-dock";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "conversation", label: "Conversation" },
  { key: "plan", label: "Plan" },
  { key: "diff", label: "Diff" },
  { key: "commits", label: "Commits" },
  { key: "prs", label: "PRs" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { error, tab } = await searchParams;
  const activeTab: TabKey = (TABS.some(t => t.key === tab) ? tab : "conversation") as TabKey;

  const result = await getSessionDetail(id);
  if (!result) notFound();
  const { session } = result;
  const metadata = await getSessionMetadata(session.id);
  const shortId = session.id.slice(0, 8);
  const returnUrl = `/sessions/${session.id}`;
  const resumeCmd = `cd "${session.projectPath}" && claude --resume ${session.id}`;

  return (
    <div className="ide-layout">
      {/* Header -- renders immediately */}
      <div className="ide-header" style={{ position: "relative" }}>
        <Link
          href="/"
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
          }}
        >
          &larr; back
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <BookmarkButton
          sessionId={session.id}
          bookmarked={metadata?.bookmarked || false}
          returnUrl={returnUrl}
          size="sm"
        />
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          {session.project}
        </span>
        {session.branch && (
          <span style={{ color: "var(--green)", fontSize: "12px" }}>
            {session.branch}
          </span>
        )}
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            fontFamily: "monospace",
          }}
        >
          {shortId}
        </span>
        {session.status === "active" && session.activeState && (
          <span
            className="ide-active-badge"
            style={{
              background:
                session.activeState === "working"
                  ? "rgba(0,100,255,0.15)"
                  : session.activeState === "thinking"
                    ? "rgba(0,255,65,0.15)"
                    : session.activeState === "waiting"
                      ? "rgba(255,170,0,0.15)"
                      : "rgba(100,100,100,0.15)",
              color:
                session.activeState === "working"
                  ? "var(--blue)"
                  : session.activeState === "thinking"
                    ? "var(--green)"
                    : session.activeState === "waiting"
                      ? "var(--amber)"
                      : "var(--text-muted)",
            }}
          >
            {session.activeState}
          </span>
        )}
        <span
          id="resume-copy-btn"
          data-cmd={resumeCmd}
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            cursor: "pointer",
            padding: "2px 6px",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            marginLeft: "auto",
          }}
        >
          [ copy resume cmd ]
        </span>
        <div className="ide-header-glow" />
      </div>

      {/* Tab bar */}
      <div className="ide-tab-bar">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/sessions/${id}?tab=${key}`}
            style={{
              color: activeTab === key ? "var(--green)" : "var(--text-muted)",
              fontSize: "12px",
              padding: "6px 12px",
              borderBottom: activeTab === key ? "2px solid var(--green)" : "2px solid transparent",
            }}
          >
            [{label}]
          </Link>
        ))}
      </div>

      {/* Main area -- independent Suspense zones, keyed by id */}
      <div className="ide-main">
        <Suspense fallback={<IdeSidebarPlaceholder />} key={`sidebar-${id}`}>
          <AsyncIdeSidebar sessionId={id} error={error} />
        </Suspense>

        <div id="ide-sidebar-drag" className="ide-sidebar-drag">{" "}</div>

        {activeTab === "conversation" && (
          <Suspense fallback={<ConversationPlaceholder />} key={`conv-${id}`}>
            <AsyncConversation sessionId={id} />
          </Suspense>
        )}
        {activeTab === "plan" && (
          <Suspense fallback={<ConversationPlaceholder />} key={`plan-${id}`}>
            <AsyncPlanViewer sessionId={id} />
          </Suspense>
        )}
        {activeTab === "diff" && (
          <Suspense fallback={<ConversationPlaceholder />} key={`diff-${id}`}>
            <AsyncDiffViewer sessionId={id} />
          </Suspense>
        )}
        {activeTab === "commits" && (
          <Suspense fallback={<ConversationPlaceholder />} key={`commits-${id}`}>
            <AsyncCommitLinks sessionId={id} />
          </Suspense>
        )}
        {activeTab === "prs" && (
          <Suspense fallback={<ConversationPlaceholder />} key={`prs-${id}`}>
            <AsyncPRLinks sessionId={id} />
          </Suspense>
        )}
      </div>

      {/* Terminal dock */}
      <Suspense fallback={<DockPlaceholder />} key={`dock-${id}`}>
        <AsyncTerminalDock sessionId={id} />
      </Suspense>
    </div>
  );
}
