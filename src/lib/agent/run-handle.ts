import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import type { AgentProvider, AgentResult } from "./adapter.js";
import type { RunState, RunStatus, SpawnArgs } from "./runtime-types.js";
import { writeRunState } from "./run-state.js";

const OUTPUT_TAIL_LINES = 50;
const DEBOUNCE_MS = 1000;

interface RunHandleOptions {
  taskId: string;
  phase: string;
  provider: string;
  model?: string;
  techleadDir: string;
  timeoutMs?: number;
}

function generateRunId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `run-${ts}-${rand}`;
}

export class RunHandle extends EventEmitter {
  readonly runId: string;
  private child: ChildProcess;
  private chunks: string[] = [];
  private state: RunState;
  private opts: RunHandleOptions;
  private resultPromise: Promise<AgentResult>;
  private resolveResult!: (result: AgentResult) => void;
  private settled = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(child: ChildProcess, opts: RunHandleOptions, runId: string) {
    super();
    this.child = child;
    this.opts = opts;
    this.runId = runId;

    this.state = {
      runId,
      taskId: opts.taskId,
      phase: opts.phase,
      provider: opts.provider as AgentProvider,
      model: opts.model,
      status: "running",
      pid: child.pid ?? null,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      completedAt: null,
      outputTail: [],
      bytesReceived: 0,
      chunksReceived: 0,
      exitCode: null,
      error: null,
    };

    this.resultPromise = new Promise((resolve) => {
      this.resolveResult = resolve;
    });

    this.flushState();
    this.wire();
  }

  static spawn(spawnArgs: SpawnArgs, opts: RunHandleOptions): RunHandle {
    const runId = generateRunId();
    const child = spawn(spawnArgs.cmd, spawnArgs.args, {
      env: { ...process.env, ...spawnArgs.env },
      stdio: [spawnArgs.input ? "pipe" : "ignore", "pipe", "pipe"],
    });

    const handle = new RunHandle(child, opts, runId);

    if (spawnArgs.input && child.stdin) {
      child.stdin.write(spawnArgs.input);
      child.stdin.end();
    }

    if (opts.timeoutMs) {
      handle.timeoutTimer = setTimeout(() => {
        handle.finish("timeout", null, "Execution timed out");
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
        }, 5000);
      }, opts.timeoutMs);
    }

    return handle;
  }

  get status(): RunStatus {
    return this.state.status;
  }

  get output(): string {
    return this.chunks.join("");
  }

  result(): Promise<AgentResult> {
    return this.resultPromise;
  }

  cancel(): void {
    if (this.settled) return;
    this.finish("cancelled", null, "Cancelled by user");
    this.child.kill("SIGTERM");
    setTimeout(() => {
      if (!this.child.killed) this.child.kill("SIGKILL");
    }, 15000);
  }

  private wire(): void {
    this.child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      this.chunks.push(chunk);
      this.state.bytesReceived += data.length;
      this.state.chunksReceived += 1;
      this.state.lastActivityAt = new Date().toISOString();
      this.updateOutputTail(chunk);
      this.debouncedFlush();
      this.emit("stdout", chunk);
    });

    this.child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      this.chunks.push(chunk);
      this.state.bytesReceived += data.length;
      this.state.chunksReceived += 1;
      this.state.lastActivityAt = new Date().toISOString();
      this.updateOutputTail(chunk);
      this.debouncedFlush();
      this.emit("stderr", chunk);
    });

    this.child.on("close", (code) => {
      if (!this.settled) {
        const status: RunStatus = code === 0 ? "completed" : "failed";
        this.finish(status, code, code !== 0 ? `Process exited with code ${code}` : null);
      }
    });

    this.child.on("error", (err) => {
      if (!this.settled) {
        this.finish("failed", null, err.message);
      }
    });
  }

  private finish(status: RunStatus, exitCode: number | null, error: string | null): void {
    if (this.settled) return;
    this.settled = true;

    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.state.status = status;
    this.state.exitCode = exitCode;
    this.state.error = error;
    this.state.completedAt = new Date().toISOString();
    this.flushState();

    this.resolveResult({
      success: status === "completed",
      content: this.chunks.join(""),
      error: error ?? undefined,
    });

    this.emit("complete", status);
  }

  private updateOutputTail(chunk: string): void {
    const lines = chunk.split("\n").filter((l) => l.length > 0);
    this.state.outputTail.push(...lines);
    if (this.state.outputTail.length > OUTPUT_TAIL_LINES) {
      this.state.outputTail = this.state.outputTail.slice(-OUTPUT_TAIL_LINES);
    }
  }

  private debouncedFlush(): void {
    if (this.debounceTimer) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flushState();
    }, DEBOUNCE_MS);
  }

  private flushState(): void {
    try {
      writeRunState(this.state, this.opts.techleadDir);
    } catch {
      // non-fatal
    }
  }
}
