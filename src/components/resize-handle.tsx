"use client";

import { useCallback, useEffect, useRef } from "react";

export default function ResizeHandle({ targetId }: { targetId: string }) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = document.getElementById(targetId);
      if (!target) return;
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = target.offsetWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [targetId]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      const newWidth = Math.max(180, Math.min(startWidth.current + e.clientX - startX.current, window.innerWidth * 0.5));
      target.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [targetId]);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: "4px",
        cursor: "col-resize",
        background: "transparent",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Visible hover indicator */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "1px",
          width: "2px",
          background: "var(--border)",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--green)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--border)";
        }}
      />
    </div>
  );
}
