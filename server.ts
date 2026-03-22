import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import fs from "fs";
import path from "path";
import os from "os";
import { getAllSessions } from "./lib/claude-data";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

function sessionExists(sessionId: string): boolean {
  try {
    const dirs = fs.readdirSync(PROJECTS_DIR);
    for (const dir of dirs) {
      const dirPath = path.join(PROJECTS_DIR, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      const filePath = path.join(dirPath, `${sessionId}.jsonl`);
      if (fs.existsSync(filePath)) return true;
    }
  } catch {
    // Projects dir may not exist
  }
  return false;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const parsedUrl = parse(req.url!, true);

    if (parsedUrl.pathname !== "/api/terminal") {
      // Let Next.js handle HMR and other WebSocket upgrades
      return;
    }

    const sessionId = parsedUrl.query.sessionId as string;
    const cwd = parsedUrl.query.cwd as string;

    if (!sessionId || !cwd) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // Validate session ID format (UUID-like)
    if (!/^[a-f0-9-]+$/i.test(sessionId)) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    if (!sessionExists(sessionId)) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, { sessionId, cwd });
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wss.on("connection", (ws: WebSocket, _req: any, meta: { sessionId: string; cwd: string }) => {
    const shell = process.env.SHELL || "/bin/zsh";
    let ptyProcess: pty.IPty;

    try {
      ptyProcess = pty.spawn(shell, ["-l", "-c", `claude --resume ${meta.sessionId}`], {
        name: "xterm-256color",
        cols: 120,
        rows: 30,
        cwd: meta.cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
        } as Record<string, string>,
      });
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: "Failed to spawn terminal" }));
      ws.close();
      return;
    }

    // PTY → WebSocket
    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "output", data }));
      }
    });

    ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "exit", exitCode }));
        ws.close();
      }
    });

    // WebSocket → PTY
    ws.on("message", (msg: Buffer | string) => {
      try {
        const message = JSON.parse(msg.toString());
        if (message.type === "input") {
          ptyProcess.write(message.data);
        } else if (message.type === "resize") {
          ptyProcess.resize(
            Math.max(1, message.cols || 120),
            Math.max(1, message.rows || 30)
          );
        }
      } catch {
        // Non-JSON message, treat as raw input
        ptyProcess.write(msg.toString());
      }
    });

    ws.on("close", () => {
      try {
        ptyProcess.kill();
      } catch {
        // Already exited
      }
    });

    ws.on("error", () => {
      try {
        ptyProcess.kill();
      } catch {
        // Already exited
      }
    });
  });

  server.listen(port, () => {
    console.log(`> claude-monitor ready on http://${hostname}:${port}`);
    // Pre-warm session list cache for faster first navigation
    getAllSessions().catch(() => {});
  });
});
