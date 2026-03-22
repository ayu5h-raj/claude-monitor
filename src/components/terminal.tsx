"use client";

import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  sessionId: string;
  cwd: string;
}

export default function Terminal({ sessionId, cwd }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "exited">("connecting");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let ws: WebSocket | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let term: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fitAddon: any = null;
    let disposed = false;

    async function init() {
      try {
        const { Terminal: XTerm } = await import("@xterm/xterm");
        const { FitAddon } = await import("@xterm/addon-fit");
        const { WebLinksAddon } = await import("@xterm/addon-web-links");

        if (disposed || !containerRef.current) return;

        term = new XTerm({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
          theme: {
            background: "#0a0a0a",
            foreground: "#cccccc",
            cursor: "#00ff41",
            cursorAccent: "#0a0a0a",
            selectionBackground: "rgba(0, 255, 65, 0.2)",
            black: "#0a0a0a",
            red: "#ff4444",
            green: "#00ff41",
            yellow: "#ffaa00",
            blue: "#00aaff",
            magenta: "#aa88ff",
            cyan: "#00aaff",
            white: "#cccccc",
            brightBlack: "#555555",
            brightRed: "#ff4444",
            brightGreen: "#00ff41",
            brightYellow: "#ffaa00",
            brightBlue: "#00aaff",
            brightMagenta: "#aa88ff",
            brightCyan: "#00aaff",
            brightWhite: "#ffffff",
          },
          allowProposedApi: true,
        });

        fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());
        term.open(containerRef.current);

        // Delay fit to ensure container has dimensions
        setTimeout(() => {
          if (!disposed) fitAddon.fit();
        }, 100);

        // Connect WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/terminal?sessionId=${encodeURIComponent(sessionId)}&cwd=${encodeURIComponent(cwd)}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (disposed) return;
          setStatus("connected");
          ws?.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          }));
        };

        ws.onmessage = (event) => {
          if (disposed) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "output") {
              term.write(msg.data);
            } else if (msg.type === "exit") {
              setStatus("exited");
              setExitCode(msg.exitCode);
              term.write(`\r\n\x1b[33m[Process exited with code ${msg.exitCode}]\x1b[0m\r\n`);
            } else if (msg.type === "error") {
              term.write(`\r\n\x1b[31m[Error: ${msg.message}]\x1b[0m\r\n`);
              setStatus("disconnected");
            }
          } catch {
            // Non-JSON message
          }
        };

        ws.onclose = () => {
          if (disposed) return;
          setStatus((prev) => prev === "exited" ? prev : "disconnected");
        };

        ws.onerror = () => {
          if (disposed) return;
          setStatus("disconnected");
        };

        // Terminal input → WebSocket
        term.onData((data: string) => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "input", data }));
          }
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          if (disposed || !fitAddon) return;
          fitAddon.fit();
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }));
          }
        });
        resizeObserver.observe(containerRef.current);

        cleanupRef.current = () => {
          disposed = true;
          resizeObserver.disconnect();
          ws?.close();
          term?.dispose();
        };
      } catch (err) {
        console.error("[Terminal] init error:", err);
        setStatus("disconnected");
      }
    }

    init();

    return () => {
      cleanupRef.current?.();
    };
  }, [sessionId, cwd]);

  const statusColor = {
    connecting: "var(--amber)",
    connected: "var(--green)",
    disconnected: "var(--red)",
    exited: "var(--text-muted)",
  }[status];

  const statusLabel = {
    connecting: "connecting...",
    connected: "CONNECTED",
    disconnected: "DISCONNECTED",
    exited: `exited (${exitCode})`,
  }[status];

  return (
    <div
      style={{
        marginBottom: "24px",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border)",
          fontSize: "11px",
        }}
      >
        <span
          className={status === "connected" ? "live-dot" : undefined}
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: statusColor,
            boxShadow: status === "connected" ? `0 0 4px ${statusColor}` : "none",
          }}
        />
        <span style={{ color: statusColor, letterSpacing: "0.05em", fontWeight: "bold" }}>
          {statusLabel}
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          claude --resume {sessionId.slice(0, 8)}...
        </span>
      </div>
      <div
        ref={containerRef}
        style={{
          height: "350px",
          background: "#0a0a0a",
          padding: "4px",
        }}
      />
    </div>
  );
}
