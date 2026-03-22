"use client";

import Link from "next/link";

export default function SessionError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      fontFamily: "monospace",
    }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <div style={{ color: "#ff4444", fontSize: "14px", marginBottom: "8px" }}>
          error: failed to load session
        </div>
        <div style={{ color: "#555555", fontSize: "12px", marginBottom: "16px" }}>
          {error.digest ? `[digest: ${error.digest}]` : "The session file may be corrupt or missing."}
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => unstable_retry()}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#00ff41",
              padding: "6px 16px",
              fontFamily: "monospace",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            [ retry ]
          </button>
          <Link
            href="/"
            style={{
              border: "1px solid #333",
              color: "#888",
              padding: "6px 16px",
              fontSize: "12px",
            }}
          >
            [ back to sessions ]
          </Link>
        </div>
      </div>
    </div>
  );
}
