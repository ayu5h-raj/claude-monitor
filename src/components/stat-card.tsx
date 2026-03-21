interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}

export default function StatCard({
  label,
  value,
  subtitle,
  color = "var(--green)",
}: StatCardProps) {
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
          textTransform: "uppercase",
          fontSize: "10px",
          color: "var(--text-muted)",
          marginBottom: "8px",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: color,
          marginBottom: subtitle ? "4px" : "0",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
