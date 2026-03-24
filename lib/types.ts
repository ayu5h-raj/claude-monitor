// ─── Display Models ─────────────────────────────────────────────

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface Session {
  id: string;
  project: string;
  projectPath: string;
  worktree?: string;
  branch: string;
  startedAt: Date;
  lastActiveAt: Date;
  messageCount: number;
  toolCallCount: number;
  tokenUsage: TokenUsage;
  contextSize: number;
  model: string;
  status: "active" | "completed";
  activeState?: "working" | "waiting" | "thinking" | "idle";
  filesChanged: string[];
  toolStats: Record<string, { calls: number; errors: number }>;
  firstMessage?: string;
}

export interface SessionEntry {
  type: "user" | "assistant" | "tool_use" | "tool_result";
  timestamp: Date;
  content: string;
  model?: string;
  usage?: TokenUsage;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  isError?: boolean;
  uuid: string;
}

export interface Repository {
  name: string;
  path: string;
  worktrees: Worktree[];
  sessionCount: number;
  lastActiveAt: Date;
}

export interface Worktree {
  name: string;
  sessionCount: number;
  lastActiveAt: Date;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface StatsData {
  totalSessions: number;
  totalMessages: number;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cacheReadInputTokens: number;
      cacheCreationInputTokens: number;
    }
  >;
  longestSession?: {
    sessionId: string;
    duration: number;
    messageCount: number;
  };
  firstSessionDate?: string;
}

// ─── Raw JSONL Structures ───────────────────────────────────────

export interface RawJSONLEntry {
  type: string;
  uuid?: string;
  parentUuid?: string;
  timestamp?: string;
  message?: RawMessage;
  cwd?: string;
  sessionId?: string;
  version?: string;
  gitBranch?: string;
  requestId?: string;
  toolUseResult?: Record<string, unknown>;
  sourceToolAssistantUUID?: string;
  data?: Record<string, unknown>;
  subtype?: string;
  durationMs?: number;
}

export interface RawMessage {
  role: string;
  model?: string;
  content: string | RawContentBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export interface RawContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: Record<string, unknown>;
  id?: string;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

// ─── Active Session ─────────────────────────────────────────────

export interface ActiveSession {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
}

export interface SessionMetadata {
  bookmarked?: boolean;
  tags?: string[];
  notes?: string;
  updatedAt: string; // ISO timestamp
}

// ─── Code Impact ────────────────────────────────────────────────

export type ChangeType = "created" | "modified" | "deleted";

export interface FileChange {
  filePath: string;
  changeType: ChangeType;
  edits: Array<{ oldString: string; newString: string }>;
  createdContent?: string;
}

export interface CodeImpact {
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
  totalEdits: number;
  linesAdded: number;
  linesRemoved: number;
  impactScore: number;
  filesByDirectory: Record<string, FileChange[]>;
  allFiles: FileChange[];
}

// ─── Search ─────────────────────────────────────────────────────

export interface SearchResult {
  sessionId: string;
  project: string;
  projectPath: string;
  branch: string;
  lastActiveAt: string;
  snippet: string;
  matchType: "user" | "assistant" | "tool_input" | "tool_result";
  score: number;
}

// ─── Live Session / SSE ─────────────────────────────────────────

export interface SerializedSessionEntry {
  type: "user" | "assistant" | "tool_use" | "tool_result";
  timestamp: string;
  content: string;
  model?: string;
  usage?: TokenUsage;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  isError?: boolean;
  uuid: string;
}

export interface SessionCommit {
  hash: string;
  shortHash: string;
  subject: string;
  date: string;
  author: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  patch: string;
}

export interface SSEMessage {
  type: "new_entry" | "session_complete" | "heartbeat";
  entry?: SerializedSessionEntry;
  timestamp: string;
}

// ─── Config Inventory ───────────────────────────────────────────

export interface PluginInfo {
  name: string;
  marketplace: string;
  version: string;
  enabled: boolean;
  blocked?: { reason: string; text: string };
  description?: string;
  mcpServers: McpServerInfo[];
  hooks: HookInfo[];
  skills: SkillInfo[];
  commands: CommandInfo[];
}

export interface SkillInfo {
  name: string;
  description?: string;
  source: "global" | "plugin";
  pluginName?: string;
  allowedTools?: string[];
  content?: string;
}

export interface McpServerInfo {
  name: string;
  type?: string;
  command: string;
  args: string[];
  source: "plugin" | "project";
  pluginName?: string;
}

export interface CommandInfo {
  name: string;
  filename: string;
  source: "global" | "plugin";
  pluginName?: string;
  preview: string;
  content?: string;
}

export interface HookInfo {
  event: string;
  matcher?: string;
  commands: string[];
  pluginName?: string;
}

export interface GlobalConfig {
  plugins: PluginInfo[];
  skills: SkillInfo[];
  mcpServers: McpServerInfo[];
  commands: CommandInfo[];
  hooks: HookInfo[];
}

export interface RepoConfig {
  repoPath: string;
  repoName: string;
  claudeMdContent?: string;
  agentsMdContent?: string;
  permissions?: { allow: string[]; deny?: string[] };
  hooks?: HookInfo[];
  commands: RepoCommandInfo[];
  skills: RepoSkillInfo[];
  sessionCount: number;
}

export interface RepoCommandInfo {
  name: string;
  filename: string;
  content: string;
}

export interface RepoSkillInfo {
  name: string;
  description?: string;
  content: string;
  allowedTools?: string[];
}
