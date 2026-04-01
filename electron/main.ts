import { app, BrowserWindow } from "electron";
import { createServer, Server } from "http";
import { parse } from "url";
import { createServer as createNetServer } from "net";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import fs from "fs";
import path from "path";
import os from "os";

// Flag for the client to know it's running inside Electron (enables update checks)
process.env.NEXT_PUBLIC_IS_DESKTOP = "true";

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

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createNetServer();
    srv.listen(0, () => {
      const addr = srv.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        reject(new Error("Failed to get available port"));
      }
    });
    srv.on("error", reject);
  });
}

function getProjectDir(): string {
  if (app.isPackaged) {
    // In packaged app, resources are at process.resourcesPath/app/
    return path.join(process.resourcesPath, "app");
  }
  // In dev, project root is one level up from electron/
  return path.join(__dirname, "..");
}

async function startServer(port: number): Promise<Server> {
  const isDev = !app.isPackaged;
  const projectDir = getProjectDir();
  const hostname = "localhost";

  const nextApp = next({ dev: isDev, hostname, port, dir: projectDir });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

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

    const sessionId = parsedUrl.query.sessionId as string | undefined;
    const cwd = parsedUrl.query.cwd as string;

    if (!cwd) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    if (sessionId) {
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
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, { sessionId: sessionId || null, cwd });
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wss.on("connection", (ws: WebSocket, _req: any, meta: { sessionId: string | null; cwd: string }) => {
    const shell = process.env.SHELL || "/bin/zsh";
    const claudeCmd = meta.sessionId
      ? `claude --resume ${meta.sessionId}`
      : "claude";

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, ["-l", "-c", claudeCmd], {
        name: "xterm-256color",
        cols: 120,
        rows: 30,
        cwd: meta.cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
        } as Record<string, string>,
      });
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Failed to spawn terminal" }));
      ws.close();
      return;
    }

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
        ptyProcess.write(msg.toString());
      }
    });

    ws.on("close", () => {
      try { ptyProcess.kill(); } catch { /* already exited */ }
    });

    ws.on("error", () => {
      try { ptyProcess.kill(); } catch { /* already exited */ }
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, hostname, () => {
      console.log(`> claude-monitor ready on http://${hostname}:${port}`);
      resolve(server);
    });
    server.on("error", reject);
  });
}

function createWindow(port: number): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(`http://localhost:${port}`);
  return win;
}

let httpServer: Server | null = null;

app.whenReady().then(async () => {
  const isDev = !app.isPackaged;

  if (isDev) {
    // In dev mode, server.ts is running via concurrently — just open the window
    const port = parseInt(process.env.PORT || "3000", 10);
    createWindow(port);
  } else {
    // In production, start the full server inside Electron
    const port = await getAvailablePort();
    httpServer = await startServer(port);
    createWindow(port);
  }
});

app.on("window-all-closed", () => {
  if (httpServer) {
    httpServer.close();
  }
  app.quit();
});
