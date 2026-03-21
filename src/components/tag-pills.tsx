import { removeTagAction } from "@/src/app/actions/metadata";

const TAG_COLORS = ["#00ff41", "#ffaa00", "#00aaff", "#aa88ff", "#ff4444"];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash += tag.charCodeAt(i);
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

interface TagPillsProps {
  tags: string[];
  sessionId?: string;
  returnUrl?: string;
}

export function TagPills({ tags, sessionId, returnUrl }: TagPillsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <span style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
      {tags.map((tag) => {
        const color = getTagColor(tag);
        return (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "3px",
              border: `1px solid ${color}44`,
              color,
              background: `${color}11`,
            }}
          >
            {tag}
            {sessionId && returnUrl && (
              <form action={removeTagAction} style={{ display: "inline", margin: 0 }}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="tag" value={tag} />
                <input type="hidden" name="returnUrl" value={returnUrl} />
                <button
                  type="submit"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    fontSize: "10px",
                    padding: "0 0 0 2px",
                    fontFamily: "inherit",
                  }}
                >
                  ×
                </button>
              </form>
            )}
          </span>
        );
      })}
    </span>
  );
}

export { getTagColor };
