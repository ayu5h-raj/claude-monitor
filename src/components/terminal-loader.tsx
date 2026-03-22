const progressBarStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "3px",
  zIndex: 9999,
  background: "linear-gradient(90deg, transparent 0%, #00ff41 50%, transparent 100%)",
  backgroundSize: "200% 100%",
  animation: "loadingBar 1.5s ease-in-out infinite",
};

const containerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
  fontFamily: "monospace",
  color: "#00ff41",
};

const innerStyle = {
  textAlign: "center" as const,
  fontSize: "13px",
  lineHeight: "2",
};

const mutedStyle = {
  color: "#555555",
  fontSize: "11px",
};

export function ProgressBar() {
  return (
    <>
      <style>{`@keyframes loadingBar { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      <div style={progressBarStyle} />
    </>
  );
}

export function SidebarPlaceholder({ width = "300px" }: { width?: string }) {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div style={{
      width,
      minWidth: width,
      borderRight: "1px solid #222222",
      padding: "12px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
    }}>
      <div style={{ fontSize: "10px", color: "#555555", textTransform: "uppercase" as const }}>repos</div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid #1a1a1a" }}>
          <div style={barStyle(i % 2 === 0 ? "80%" : "60%")} />
        </div>
      ))}
    </div>
  );
}

export function SessionListPlaceholder() {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div style={{ flex: 1, padding: "12px 16px" }}>
      <div style={{ color: "#00ff41", fontSize: "12px", marginBottom: "12px", fontFamily: "monospace" }}>
        &gt; loading sessions...<span style={{ animation: "blink 1s step-end infinite" }}>_</span>
      </div>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #1a1a1a", display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#222222" }} />
          <div style={barStyle("120px")} />
          <div style={barStyle("80px")} />
          <div style={barStyle("60px")} />
          <div style={{ marginLeft: "auto", ...barStyle("40px") }} />
        </div>
      ))}
    </div>
  );
}

export function IdeSidebarPlaceholder() {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-section" style={{ padding: "8px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={barStyle(i % 2 === 0 ? "80%" : "60%")} />
          ))}
        </div>
      </div>
      <div className="ide-sidebar-section" style={{ padding: "6px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...barStyle("100%"), height: "28px" }} />
          ))}
        </div>
      </div>
      <div className="ide-sidebar-section" style={{ padding: "8px 14px" }}>
        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: "6px" }}>Tags</div>
        <div style={barStyle("60%")} />
      </div>
    </div>
  );
}

export function ConversationPlaceholder() {
  const barStyle = (w: string) => ({
    height: "10px",
    borderRadius: "2px",
    background: "#151515",
    width: w,
    animation: "pulse 2s ease-in-out infinite",
  });

  return (
    <div className="ide-center" style={{ padding: "16px" }}>
      <div style={{ color: "#00ff41", fontSize: "12px", marginBottom: "16px", fontFamily: "monospace" }}>
        &gt; loading conversation...<span style={{ animation: "blink 1s step-end infinite" }}>_</span>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ marginBottom: "16px", padding: "12px", borderLeft: `2px solid ${i % 2 === 0 ? "#151515" : "#0a1a0a"}` }}>
          <div style={{ ...barStyle(i % 2 === 0 ? "40%" : "30%"), marginBottom: "8px" }} />
          <div style={barStyle("90%")} />
          <div style={{ ...barStyle("70%"), marginTop: "4px" }} />
          <div style={{ ...barStyle("50%"), marginTop: "4px" }} />
        </div>
      ))}
    </div>
  );
}

export function DockPlaceholder() {
  return (
    <details className="ide-dock">
      <summary>
        <span className="ide-dock-label">TERMINAL</span>
        <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--text-muted)" }} />
        <span className="ide-dock-hint" style={{ color: "var(--text-muted)" }}>loading...</span>
      </summary>
    </details>
  );
}

export default function TerminalLoader({ message = "loading" }: { message?: string }) {
  return (
    <>
      <ProgressBar />
      <div style={containerStyle}>
        <div style={innerStyle}>
          <div>&gt; {message}...</div>
          <div>
            <span style={{ color: "#00ff41" }}>{"████████░░░░░░░░"}</span>
          </div>
          <div style={mutedStyle}>
            awaiting response
            <span style={{ animation: "blink 1s step-end infinite" }}>_</span>
          </div>
        </div>
      </div>
    </>
  );
}
