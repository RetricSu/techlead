import type { AgentProvider } from "./adapter.js";

export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "timeout";

/** Persisted to .techlead/tasks/{taskId}/runs/{runId}.json */
export interface RunState {
  runId: string;
  taskId: string;
  phase: string;
  provider: AgentProvider;
  model?: string;
  status: RunStatus;
  pid: number | null;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  outputTail: string[];
  bytesReceived: number;
  chunksReceived: number;
  exitCode: number | null;
  error: string | null;
}

/** Arguments for spawning an agent process */
export interface SpawnArgs {
  cmd: string;
  args: string[];
  input?: string;
  env?: Record<string, string>;
}
