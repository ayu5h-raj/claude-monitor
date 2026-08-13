import { getSessionDetail } from "@/lib/claude-data";
import { notFound } from "next/navigation";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSessionDetail(id);

  if (!detail) {
    notFound();
  }

  const { session } = detail;
  const toolCallCount = session.toolCallCount ?? 0;
  const inputTokens = session.tokenUsage?.input ?? 0;
  const outputTokens = session.tokenUsage?.output ?? 0;
  const totalTokens = inputTokens + outputTokens;

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2 style={{ color: "#00ff41", marginBottom: "16px" }}>Session Insights</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div style={{ background: "#1a1a1a", padding: "16px", borderRadius: "8px", border: "1px solid #333" }}>
          <div style={{ color: "#888", fontSize: "12px" }}>Tool Calls</div>
          <div style={{ color: "#00ff41", fontSize: "24px", fontWeight: "bold" }}>{toolCallCount}</div>
        </div>
        <div style={{ background: "#1a1a1a", padding: "16px", borderRadius: "8px", border: "1px solid #333" }}>
          <div style={{ color: "#888", fontSize: "12px" }}>Input Tokens</div>
          <div style={{ color: "#00aaff", fontSize: "24px", fontWeight: "bold" }}>{inputTokens.toLocaleString()}</div>
        </div>
        <div style={{ background: "#1a1a1a", padding: "16px", borderRadius: "8px", border: "1px solid #333" }}>
          <div style={{ color: "#888", fontSize: "12px" }}>Output Tokens</div>
          <div style={{ color: "#ffaa00", fontSize: "24px", fontWeight: "bold" }}>{outputTokens.toLocaleString()}</div>
        </div>
        <div style={{ background: "#1a1a1a", padding: "16px", borderRadius: "8px", border: "1px solid #333" }}>
          <div style={{ color: "#888", fontSize: "12px" }}>Total Tokens</div>
          <div style={{ color: "#aa88ff", fontSize: "24px", fontWeight: "bold" }}>{totalTokens.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
