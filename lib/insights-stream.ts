import { saveCachedInsights } from "./insights-cache";

export type StreamEvent =
  | { type: "chunk"; text: string }
  | { type: "complete" }
  | { type: "error"; message: string };

export type StreamSubscriber = (event: StreamEvent) => void;

export interface ActiveGeneration {
  sessionId: string;
  model: string;
  content: string;
  subscribers: Set<StreamSubscriber>;
  done: boolean;
  error?: string;
}

// In Next.js with Turbopack, server components and route handlers can be
// loaded as separate module instances. A plain module-scoped Map would not
// be shared between them — the route handler would register a generation
// that the server component (calling isInProgress) couldn't see. Pin the
// map to globalThis to guarantee a single instance per process.
const GLOBAL_KEY = Symbol.for("claude-monitor.insights.activeGenerations");
type GlobalWithMap = typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, ActiveGeneration>;
};
const g = globalThis as GlobalWithMap;
const active: Map<string, ActiveGeneration> =
  g[GLOBAL_KEY] ?? (g[GLOBAL_KEY] = new Map());

export function isInProgress(sessionId: string): boolean {
  const gen = active.get(sessionId);
  return !!gen && !gen.done;
}

export function getActiveGeneration(sessionId: string): ActiveGeneration | null {
  const gen = active.get(sessionId);
  if (!gen || gen.done) return null;
  return gen;
}

export function startGeneration(sessionId: string, model: string): ActiveGeneration {
  const gen: ActiveGeneration = {
    sessionId,
    model,
    content: "",
    subscribers: new Set(),
    done: false,
  };
  active.set(sessionId, gen);
  return gen;
}

export function appendChunk(gen: ActiveGeneration, chunk: string): void {
  gen.content += chunk;
  for (const sub of gen.subscribers) {
    try {
      sub({ type: "chunk", text: chunk });
    } catch {
      // ignore subscriber errors
    }
  }
}

export function finishGeneration(gen: ActiveGeneration): void {
  if (gen.done) return;
  gen.done = true;
  for (const sub of gen.subscribers) {
    try {
      sub({ type: "complete" });
    } catch {
      // ignore
    }
  }
  if (gen.content) {
    saveCachedInsights(gen.sessionId, {
      generatedAt: new Date().toISOString(),
      model: gen.model,
      content: gen.content,
    }).catch(() => {
      // swallow cache write errors
    });
  }
  // Linger briefly so late subscribers can still fetch the final state,
  // then drop from the map.
  setTimeout(() => {
    if (active.get(gen.sessionId) === gen) active.delete(gen.sessionId);
  }, 30_000);
}

export function errorGeneration(gen: ActiveGeneration, message: string): void {
  if (gen.done) return;
  gen.done = true;
  gen.error = message;
  for (const sub of gen.subscribers) {
    try {
      sub({ type: "error", message });
    } catch {
      // ignore
    }
  }
  setTimeout(() => {
    if (active.get(gen.sessionId) === gen) active.delete(gen.sessionId);
  }, 30_000);
}
