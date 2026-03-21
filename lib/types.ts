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
  model: string;
  status: "active" | "completed";
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
