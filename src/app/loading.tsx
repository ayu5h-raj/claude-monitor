import { ProgressBar, SidebarPlaceholder, SessionListPlaceholder } from "@/src/components/terminal-loader";

export default function Loading() {
  return (
    <>
      <ProgressBar />
      <div style={{ display: "flex", height: "calc(100vh - 45px)", overflow: "hidden" }}>
        <SidebarPlaceholder />
        <div style={{ width: "5px", background: "var(--border)", flexShrink: 0 }} />
        <SessionListPlaceholder />
      </div>
    </>
  );
}
