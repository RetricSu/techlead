/**
 * OpenCode API Types
 *
 * TypeScript interfaces for OpenCode server API integration.
 * Based on OpenCode API spec: https://opencode.ai/docs/server/
 */

// ============================================================================
// Session Types
// ============================================================================

/**
 * File diff information for a session summary
 */
export interface FileDiff {
  file: string;
  before: string;
  after: string;
  additions: number;
  deletions: number;
}

/**
 * OpenCode Session represents a conversation session
 */
export interface Session {
  /** Unique session identifier */
  id: string;
  /** Project this session belongs to */
  projectID: string;
  /** Working directory for the session */
  directory: string;
  /** Parent session ID if this is a fork */
  parentID?: string;
  /** Session summary with file changes */
  summary?: {
    additions: number;
    deletions: number;
    files: number;
    diffs?: Array<FileDiff>;
  };
  /** Share information if session is shared */
  share?: {
    url: string;
  };
  /** Session title */
  title: string;
  /** OpenCode version */
  version: string;
  /** Timestamps */
  time: {
    created: number;
    updated: number;
    compacting?: number;
  };
  /** Revert information */
  revert?: {
    messageID: string;
    partID?: string;
    snapshot?: string;
    diff?: string;
  };
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Token usage information
 */
export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cache: {
    read: number;
    write: number;
  };
}

/**
 * Error types for assistant messages
 */
export type ProviderAuthError = {
  name: "ProviderAuthError";
  data: {
    providerID: string;
    message: string;
  };
};

export type UnknownError = {
  name: "UnknownError";
  data: {
    message: string;
  };
};

export type MessageOutputLengthError = {
  name: "MessageOutputLengthError";
  data: Record<string, unknown>;
};

export type MessageAbortedError = {
  name: "MessageAbortedError";
  data: {
    message: string;
  };
};

export type ApiError = {
  name: "APIError";
  data: {
    message: string;
    statusCode?: number;
    isRetryable: boolean;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
  };
};

export type MessageError =
  | ProviderAuthError
  | UnknownError
  | MessageOutputLengthError
  | MessageAbortedError
  | ApiError;

/**
 * User message in a session
 */
export interface UserMessage {
  id: string;
  sessionID: string;
  role: "user";
  time: {
    created: number;
  };
  summary?: {
    title?: string;
    body?: string;
    diffs: Array<FileDiff>;
  };
  agent: string;
  model: {
    providerID: string;
    modelID: string;
  };
  system?: string;
  tools?: Record<string, boolean>;
}

/**
 * Assistant message in a session
 */
export interface AssistantMessage {
  id: string;
  sessionID: string;
  role: "assistant";
  time: {
    created: number;
    completed?: number;
  };
  error?: MessageError;
  parentID: string;
  modelID: string;
  providerID: string;
  mode: string;
  path: {
    cwd: string;
    root: string;
  };
  summary?: boolean;
  cost: number;
  tokens: TokenUsage;
  finish?: string;
}

/**
 * Union type for all message types
 */
export type Message = UserMessage | AssistantMessage;

/**
 * Message with parts (full message response)
 */
export interface MessageWithParts {
  info: Message;
  parts: Array<Part>;
}

// ============================================================================
// Part Types (Message Components)
// ============================================================================

/**
 * Text part of a message
 */
export interface TextPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "text";
  text: string;
  synthetic?: boolean;
  ignored?: boolean;
  time?: {
    start: number;
    end?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Reasoning/thinking part of a message
 */
export interface ReasoningPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "reasoning";
  text: string;
  metadata?: Record<string, unknown>;
  time: {
    start: number;
    end?: number;
  };
}

/**
 * File part source information
 */
export interface FileSource {
  text: {
    value: string;
    start: number;
    end: number;
  };
  type: "file";
  path: string;
}

/**
 * Symbol source information
 */
export interface SymbolSource {
  text: {
    value: string;
    start: number;
    end: number;
  };
  type: "symbol";
  path: string;
  range: {
    start: {
      line: number;
      character: number;
    };
    end: {
      line: number;
      character: number;
    };
  };
  name: string;
  kind: number;
}

/**
 * File part of a message
 */
export interface FilePart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "file";
  mime: string;
  filename?: string;
  url: string;
  source?: FileSource | SymbolSource;
}

/**
 * Tool state variants
 */
export type ToolStatePending = {
  status: "pending";
  input: Record<string, unknown>;
  raw: string;
};

export type ToolStateRunning = {
  status: "running";
  input: Record<string, unknown>;
  title?: string;
  metadata?: Record<string, unknown>;
  time: {
    start: number;
  };
};

export type ToolStateCompleted = {
  status: "completed";
  input: Record<string, unknown>;
  output: string;
  title: string;
  metadata: Record<string, unknown>;
  time: {
    start: number;
    end: number;
    compacted?: number;
  };
  attachments?: Array<FilePart>;
};

export type ToolStateError = {
  status: "error";
  input: Record<string, unknown>;
  error: string;
  metadata?: Record<string, unknown>;
  time: {
    start: number;
    end: number;
  };
};

export type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError;

/**
 * Tool execution part
 */
export interface ToolPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "tool";
  callID: string;
  tool: string;
  state: ToolState;
  metadata?: Record<string, unknown>;
}

/**
 * Step start part
 */
export interface StepStartPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "step-start";
  snapshot?: string;
}

/**
 * Step finish part
 */
export interface StepFinishPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "step-finish";
  reason: string;
  snapshot?: string;
  cost: number;
  tokens: TokenUsage;
}

/**
 * Patch part (file changes)
 */
export interface PatchPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "patch";
  hash: string;
  files: Array<string>;
}

/**
 * Agent part
 */
export interface AgentPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "agent";
  name: string;
  source?: {
    value: string;
    start: number;
    end: number;
  };
}

/**
 * Retry part
 */
export interface RetryPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "retry";
  attempt: number;
  error: ApiError;
  time: {
    created: number;
  };
}

/**
 * Compaction part
 */
export interface CompactionPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "compaction";
  auto: boolean;
}

/**
 * Subtask part
 */
export interface SubtaskPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: "subtask";
  prompt: string;
  description: string;
  agent: string;
}

/**
 * Union type for all message parts
 */
export type Part =
  | TextPart
  | ReasoningPart
  | FilePart
  | ToolPart
  | StepStartPart
  | StepFinishPart
  | PatchPart
  | AgentPart
  | RetryPart
  | CompactionPart
  | SubtaskPart;

// ============================================================================
// Todo Types
// ============================================================================

/**
 * Todo item in a session
 */
export interface Todo {
  /** Unique identifier for the todo item */
  id: string;
  /** Brief description of the task */
  content: string;
  /** Current status of the task: pending, in_progress, completed, cancelled */
  status: "pending" | "in_progress" | "completed" | "cancelled";
  /** Priority level of the task: high, medium, low */
  priority: "high" | "medium" | "low";
}

// ============================================================================
// Session Status Types
// ============================================================================

/**
 * Idle session status
 */
export interface IdleSessionStatus {
  type: "idle";
}

/**
 * Retry session status
 */
export interface RetrySessionStatus {
  type: "retry";
  attempt: number;
  message: string;
  next: number;
}

/**
 * Busy session status
 */
export interface BusySessionStatus {
  type: "busy";
}

/**
 * Union type for session status
 */
export type SessionStatus = IdleSessionStatus | RetrySessionStatus | BusySessionStatus;

/**
 * Full session status with todos
 */
export interface FullSessionStatus {
  todos: Array<Todo>;
  status: SessionStatus;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * OpenCode server configuration
 */
export interface OpencodeConfig {
  /** Base URL for the OpenCode server (default: http://127.0.0.1) */
  baseUrl: string;
  /** Port for the OpenCode server (default: 4096) */
  port: number;
  /** Whether to auto-start the server if not running */
  autoStart: boolean;
  /** Optional authentication username */
  username?: string;
  /** Optional authentication password */
  password?: string;
}

// ============================================================================
// Task Runner Types
// ============================================================================

/**
 * Options for running a task via OpenCode
 */
export interface RunnerOptions {
  /** Timeout in milliseconds for the entire task */
  timeoutMs: number;
  /** Poll interval in milliseconds for checking status */
  pollIntervalMs: number;
  /** Maximum number of poll attempts before giving up */
  maxPollAttempts: number;
  /** Optional agent to use for the task */
  agent?: string;
  /** Optional model to use for the task */
  model?: string;
  /** Optional tools to enable/disable */
  tools?: Record<string, boolean>;
}

/**
 * Result from running a task via OpenCode
 */
export interface RunnerResult {
  /** Whether the task completed successfully */
  success: boolean;
  /** Content/output from the task (assistant's response) */
  content: string;
  /** Error message if the task failed */
  error?: string;
  /** Session ID where the task was executed */
  sessionId?: string;
  /** Token usage information */
  tokens?: TokenUsage;
  /** Cost of the task execution */
  cost?: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for creating a new session
 */
export interface CreateSessionRequest {
  /** Optional parent session ID */
  parentID?: string;
  /** Optional session title */
  title?: string;
}

/**
 * Request body for sending a message
 */
export interface SendMessageRequest {
  /** Optional message ID for threading */
  messageID?: string;
  /** Optional model override */
  model?: string;
  /** Optional agent override */
  agent?: string;
  /** If true, don't wait for assistant response */
  noReply?: boolean;
  /** Optional system prompt override */
  system?: string;
  /** Optional tools configuration */
  tools?: Record<string, boolean>;
  /** Message parts to send */
  parts: Array<Part>;
}

/**
 * Server health check response
 */
export interface HealthResponse {
  healthy: boolean;
  version: string;
}

/**
 * Map of session IDs to their statuses
 */
export type SessionStatusMap = Record<string, SessionStatus>;

/**
 * API error response
 */
export interface ApiErrorResponse {
  /** Error name/type */
  name: string;
  /** Error details */
  data: {
    message: string;
    [key: string]: unknown;
  };
}
