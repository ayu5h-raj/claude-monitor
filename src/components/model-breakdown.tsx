import { formatTokenCount } from "@/lib/path-utils";

interface ModelUsageEntry {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

interface ModelBreakdownProps {
  modelUsage: Record<string, ModelUsageEntry>;
}

function getModelColor(modelName: string): string {
  const lower = modelName.toLowerCase();
  if (lower.includes("opus")) return "var(--amber)";
  if (lower.includes("sonnet")) return "var(--blue)";
  if (lower.includes("haiku")) return "var(--green)";
  return "var(--text-secondary)";
}

export default function ModelBreakdown({ modelUsage }: ModelBreakdownProps) {
  const entries = Object.entries(modelUsage);

  const totalTokens = entries.reduce(
    (sum, [, usage]) => sum + usage.inputTokens + usage.outputTokens,
    0
  );

  return (
    <div
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-secondary)",
          marginBottom: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Model Breakdown
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {entries.map(([model, usage]) => {
          const tokenCount = usage.inputTokens + usage.outputTokens;
          const percentage =
            totalTokens > 0
              ? Math.round((tokenCount / totalTokens) * 100)
              : 0;
          const color = getModelColor(model);

          return (
            <div key={model}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                >
                  {model}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatTokenCount(tokenCount)} ({percentage}%)
                </span>
              </div>
              <div
                style={{
                  height: "6px",
                  background: "var(--border)",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percentage}%`,
                    background: color,
                    borderRadius: "3px",
                  }}
                />
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            No model usage data available.
          </div>
        )}
      </div>
    </div>
  );
}
