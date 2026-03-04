import { RunHandle } from "./run-handle.js";
import { cleanOrphanRuns } from "./run-state.js";
import type { SpawnArgs } from "./runtime-types.js";

interface SpawnOptions {
  taskId: string;
  phase: string;
  provider: string;
  model?: string;
  timeoutMs?: number;
}

export class AgentRuntime {
  private techleadDir: string;
  private handles = new Map<string, RunHandle>();

  constructor(techleadDir: string) {
    this.techleadDir = techleadDir;
    cleanOrphanRuns(techleadDir);
  }

  spawn(spawnArgs: SpawnArgs, opts: SpawnOptions): RunHandle {
    const handle = RunHandle.spawn(spawnArgs, {
      ...opts,
      techleadDir: this.techleadDir,
    });
    this.handles.set(handle.runId, handle);
    return handle;
  }

  list(): RunHandle[] {
    return Array.from(this.handles.values());
  }

  get(runId: string): RunHandle | undefined {
    return this.handles.get(runId);
  }

  cancel(runId: string): boolean {
    const handle = this.handles.get(runId);
    if (!handle) return false;
    handle.cancel();
    return true;
  }
}
