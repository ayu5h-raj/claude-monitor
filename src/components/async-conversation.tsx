import { getSessionDetail } from "@/lib/claude-data";
import ConversationEntry from "@/src/components/conversation-entry";
import LiveSession from "@/src/components/live-session";
import { isChatEntry, paginate } from "@/lib/path-utils";

/** Entries rendered per page. A 7000-entry session serialises to ~11MB in one
 *  go; paging keeps the payload bounded regardless of session length. */
export const PAGE_SIZE = 200;

function PageControls({
  sessionId,
  page,
  total,
  from,
  to,
  chatOnly,
}: {
  sessionId: string;
  page: number;
  total: number;
  from: number;
  to: number;
  chatOnly: boolean;
}) {
  const href = (p: number) =>
    `/sessions/${sessionId}?tab=conversation${chatOnly ? "&view=chat" : ""}${p > 1 ? `&page=${p}` : ""}`;
  const hasNewer = page > 1;
  const hasOlder = to < total;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "6px 12px",
        borderBottom: "1px solid var(--border)",
        fontSize: "11px",
        color: "var(--text-muted)",
      }}
    >
      <span>
        entries {from}-{to} of {total}
      </span>
      <span style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
        {hasNewer ? (
          <a href={href(page - 1)} style={{ color: "var(--green)" }}>
            [ ‹ newer ]
          </a>
        ) : (
          <span style={{ opacity: 0.4 }}>[ ‹ newer ]</span>
        )}
        {hasOlder ? (
          <a href={href(page + 1)} style={{ color: "var(--green)" }}>
            [ older › ]
          </a>
        ) : (
          <span style={{ opacity: 0.4 }}>[ older › ]</span>
        )}
      </span>
    </div>
  );
}

export default async function AsyncConversation({
  sessionId,
  chatOnly = false,
  page = 1,
}: {
  sessionId: string;
  chatOnly?: boolean;
  page?: number;
}) {
  const result = await getSessionDetail(sessionId);
  if (!result) return null;
  const { session, entries } = result;

  // Filter before serializing so the client payload shrinks too.
  const all = (chatOnly ? entries.filter(isChatEntry) : entries)
    .map((e) => ({
      ...e,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
    }))
    .reverse();

  const total = all.length;
  const { current, start, end, from, to } = paginate(total, page, PAGE_SIZE);
  const pageEntries = all.slice(start, end);

  // Streamed entries only make sense alongside the newest page, so deeper pages
  // render as a static historical view even while the session is running.
  const live = session.status === "active" && current === 1;

  return (
    <div className="ide-center">
      {total > PAGE_SIZE && (
        <PageControls
          sessionId={session.id}
          page={current}
          total={total}
          from={from}
          to={to}
          chatOnly={chatOnly}
        />
      )}
      {live ? (
        <LiveSession
          sessionId={session.id}
          initialEntries={pageEntries}
          chatOnly={chatOnly}
        />
      ) : (
        <div>
          {pageEntries.map((entry, i) => (
            <ConversationEntry key={`${entry.uuid}-${i}`} entry={entry} />
          ))}
          {total === 0 && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "32px" }}>
              No conversation entries found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
