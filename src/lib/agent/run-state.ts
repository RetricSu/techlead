import fs from "node:fs";
import path from "node:path";
import type { RunState } from "./runtime-types.js";

function getTaskRunsDir(taskId: string, techleadDir: string): string {
  return path.join(techleadDir, "tasks", taskId, "runs");
}

export function getRunStatePath(taskId: string, runId: string, techleadDir: string): string {
  return path.join(getTaskRunsDir(taskId, techleadDir), `${runId}.json`);
}

export function writeRunState(state: RunState, techleadDir: string): void {
  const dir = getTaskRunsDir(state.taskId, techleadDir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${state.runId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
}

export function readRunState(taskId: string, runId: string, techleadDir: string): RunState | null {
  const filePath = getRunStatePath(taskId, runId, techleadDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as RunState;
  } catch {
    return null;
  }
}

export function listActiveRuns(techleadDir: string): RunState[] {
  const tasksDir = path.join(techleadDir, "tasks");
  if (!fs.existsSync(tasksDir)) return [];

  const active: RunState[] = [];
  for (const taskEntry of fs.readdirSync(tasksDir)) {
    const runsDir = path.join(tasksDir, taskEntry, "runs");
    if (!fs.existsSync(runsDir)) continue;
    for (const file of fs.readdirSync(runsDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const state = JSON.parse(fs.readFileSync(path.join(runsDir, file), "utf8")) as RunState;
        if (state.status === "running" || state.status === "pending") {
          active.push(state);
        }
      } catch {
        /* skip corrupt files */
      }
    }
  }
  return active;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function cleanOrphanRuns(techleadDir: string): string[] {
  const active = listActiveRuns(techleadDir);
  const cleaned: string[] = [];
  for (const state of active) {
    if (state.pid && !isProcessAlive(state.pid)) {
      state.status = "failed";
      state.error = "Process orphaned (PID no longer exists)";
      state.completedAt = new Date().toISOString();
      writeRunState(state, techleadDir);
      cleaned.push(state.runId);
    }
  }
  return cleaned;
}
