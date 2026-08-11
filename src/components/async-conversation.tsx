import { getSessionDetail } from "@/lib/claude-data";
import ConversationEntry from "@/src/components/conversation-entry";
import LiveSession from "@/src/components/live-session";
import { isChatEntry } from "@/lib/path-utils";

export default async function AsyncConversation({
  sessionId,
  chatOnly = false,
}: {
  sessionId: string;
  chatOnly?: boolean;
}) {
  const result = await getSessionDetail(sessionId);
  if (!result) return null;
  const { session, entries } = result;

  // Filter before serializing so the client payload shrinks too.
  const serializedEntries = (chatOnly ? entries.filter(isChatEntry) : entries)
    .map((e) => ({
      ...e,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
    }))
    .reverse();

  return (
    <div className="ide-center">
      {session.status === "active" ? (
        <LiveSession
          sessionId={session.id}
          initialEntries={serializedEntries}
          chatOnly={chatOnly}
        />
      ) : (
        <div>
          {serializedEntries.map((entry, i) => (
            <ConversationEntry key={`${entry.uuid}-${i}`} entry={entry} />
          ))}
          {serializedEntries.length === 0 && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "32px" }}>
              No conversation entries found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
