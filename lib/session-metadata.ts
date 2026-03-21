import fs from "fs/promises";
import path from "path";
import os from "os";
import { TTLCache } from "./cache";
import type { SessionMetadata } from "./types";

function getDir(): string {
  return process.env.CLAUDE_MONITOR_DIR || path.join(os.homedir(), ".claude-monitor");
}

function getFile(): string {
  return path.join(getDir(), "session-metadata.json");
}

interface MetadataStore {
  sessions: Record<string, SessionMetadata>;
}

const cache = new TTLCache<Record<string, SessionMetadata>>(30_000);

export function _resetCacheForTests(): void {
  cache.clear();
}

async function readStore(): Promise<MetadataStore> {
  try {
    const content = await fs.readFile(getFile(), "utf-8");
    return JSON.parse(content) as MetadataStore;
  } catch {
    return { sessions: {} };
  }
}

async function writeStore(store: MetadataStore): Promise<void> {
  const dir = getDir();
  await fs.mkdir(dir, { recursive: true });
  const tmpFile = path.join(dir, `.session-metadata-${Date.now()}.tmp`);
  await fs.writeFile(tmpFile, JSON.stringify(store, null, 2));
  await fs.rename(tmpFile, getFile());
  cache.invalidate("all");
}

function validateTag(tag: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
    throw new Error(`Invalid tag "${tag}": must be lowercase alphanumeric + hyphens`);
  }
  if (tag.length > 30) {
    throw new Error(`Tag "${tag}" exceeds 30 character limit`);
  }
}

// --- Read functions ---

export async function getAllSessionMetadata(): Promise<Record<string, SessionMetadata>> {
  const cached = cache.get("all");
  if (cached) return cached;
  const store = await readStore();
  cache.set("all", store.sessions);
  return store.sessions;
}

export async function getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
  const all = await getAllSessionMetadata();
  return all[sessionId] || null;
}

export async function getAllTags(): Promise<string[]> {
  const all = await getAllSessionMetadata();
  const tagSet = new Set<string>();
  for (const meta of Object.values(all)) {
    if (meta.tags) {
      for (const tag of meta.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

// --- Write functions ---

export async function setBookmark(sessionId: string, bookmarked: boolean): Promise<void> {
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  store.sessions[sessionId].bookmarked = bookmarked;
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function addTag(sessionId: string, tag: string): Promise<void> {
  validateTag(tag);
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  const existing = store.sessions[sessionId].tags || [];
  if (existing.length >= 10) {
    throw new Error("Maximum 10 tags per session");
  }
  if (!existing.includes(tag)) {
    store.sessions[sessionId].tags = [...existing, tag];
    store.sessions[sessionId].updatedAt = new Date().toISOString();
    await writeStore(store);
  }
}

export async function removeTag(sessionId: string, tag: string): Promise<void> {
  const store = await readStore();
  if (!store.sessions[sessionId]?.tags) return;
  store.sessions[sessionId].tags = store.sessions[sessionId].tags!.filter((t) => t !== tag);
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function setTags(sessionId: string, tags: string[]): Promise<void> {
  for (const tag of tags) {
    validateTag(tag);
  }
  if (tags.length > 10) {
    throw new Error("Maximum 10 tags per session");
  }
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  store.sessions[sessionId].tags = [...new Set(tags)];
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function setNotes(sessionId: string, notes: string): Promise<void> {
  const store = await readStore();
  if (!store.sessions[sessionId]) {
    store.sessions[sessionId] = { updatedAt: new Date().toISOString() };
  }
  store.sessions[sessionId].notes = notes;
  store.sessions[sessionId].updatedAt = new Date().toISOString();
  await writeStore(store);
}
