import { ProgressBar, IdeSidebarPlaceholder, ConversationPlaceholder, DockPlaceholder } from "@/src/components/terminal-loader";

const barStyle = (width: string) => ({
  height: "10px",
  borderRadius: "2px",
  background: "#151515",
  width,
  animation: "pulse 2s ease-in-out infinite",
});

export default function Loading() {
  return (
    <div className="ide-layout">
      <ProgressBar />
      <div className="ide-header" style={{ position: "relative" }}>
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>&larr; back</span>
        <span style={{ color: "var(--border)" }}>|</span>
        <div style={barStyle("120px")} />
        <div style={barStyle("60px")} />
        <div style={barStyle("50px")} />
      </div>
      <div className="ide-main">
        <IdeSidebarPlaceholder />
        <div id="ide-sidebar-drag" className="ide-sidebar-drag">{" "}</div>
        <ConversationPlaceholder />
      </div>
      <DockPlaceholder />
    </div>
  );
}
