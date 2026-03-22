import { getSessionDetail } from "@/lib/claude-data";
import ConversationEntry from "@/src/components/conversation-entry";
import LiveSession from "@/src/components/live-session";

export default async function AsyncConversation({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (!result) return null;
  const { session, entries } = result;

  const serializedEntries = entries
    .map((e) => ({
      ...e,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
    }))
    .reverse();

  return (
    <div className="ide-center">
      {session.status === "active" ? (
        <LiveSession sessionId={session.id} initialEntries={serializedEntries} />
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
