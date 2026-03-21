import { saveNotesAction } from "@/src/app/actions/metadata";

interface SessionNotesProps {
  sessionId: string;
  notes: string;
  returnUrl: string;
}

export function SessionNotes({ sessionId, notes, returnUrl }: SessionNotesProps) {
  const preview = notes ? notes.split("\n")[0].slice(0, 60) : "No notes";

  return (
    <details style={{ marginBottom: "16px" }}>
      <summary
        style={{
          cursor: "pointer",
          color: "#888",
          fontSize: "12px",
          padding: "8px 12px",
          background: "#0d0d0d",
          border: "1px solid #222",
          borderRadius: "3px",
        }}
      >
        <span style={{ color: "#ffaa00" }}>Notes</span>
        <span style={{ color: "#555", marginLeft: "8px" }}>{preview}</span>
      </summary>
      <div
        style={{
          padding: "12px",
          background: "#0d0d0d",
          border: "1px solid #222",
          borderTop: "none",
          borderRadius: "0 0 3px 3px",
        }}
      >
        <form action={saveNotesAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="returnUrl" value={returnUrl} />
          <textarea
            name="notes"
            defaultValue={notes}
            rows={4}
            placeholder="Add notes about this session..."
            style={{
              width: "100%",
              background: "#111",
              color: "#ccc",
              border: "1px solid #333",
              borderRadius: "3px",
              padding: "8px",
              fontFamily: "inherit",
              fontSize: "12px",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: "8px", textAlign: "right" }}>
            <button
              type="submit"
              style={{
                background: "#111",
                color: "#00ff41",
                border: "1px solid #333",
                padding: "4px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "12px",
                borderRadius: "3px",
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
