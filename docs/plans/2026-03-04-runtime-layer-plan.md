# Runtime Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `execFileSync` with an async, observable runtime that supports real-time monitoring and cancellation.

**Architecture:** Introduce `AgentRuntime` + `RunHandle` abstractions backed by `child_process.spawn`. State persisted to `.techlead/tasks/{taskId}/runs/{runId}.json` for cross-process observability. All command handlers become async.

**Tech Stack:** Node.js `child_process.spawn`, `EventEmitter`, `fs.watch`, existing `cac` CLI framework (native async support).

---

### Task 1: Define runtime types

**Files:**
- Create: `src/lib/agent/runtime-types.ts`
- Test: `tests/runtime-types.test.ts`

**Step 1: Write the types file**

```typescript
// src/lib/agent/runtime-types.ts
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
```

**Step 2: Write a type-check test**

```typescript
// tests/runtime-types.test.ts
import { describe, expect, it } from "vitest";
import type { RunState, RunStatus, SpawnArgs } from "../src/lib/agent/runtime-types.js";

describe("Runtime Types", () => {
  it("should allow creating a valid RunState", () => {
    const state: RunState = {
      runId: "test-123",
      taskId: "task-456",
      phase: "exec",
      provider: "claude",
      status: "running",
      pid: 12345,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      completedAt: null,
      outputTail: [],
      bytesReceived: 0,
      chunksReceived: 0,
      exitCode: null,
      error: null,
    };
    expect(state.status).toBe("running");
    expect(state.pid).toBe(12345);
  });

  it("should allow all RunStatus values", () => {
    const statuses: RunStatus[] = ["pending", "running", "completed", "failed", "cancelled", "timeout"];
    expect(statuses).toHaveLength(6);
  });

  it("should allow creating SpawnArgs", () => {
    const args: SpawnArgs = {
      cmd: "claude",
      args: ["-p", "--output-format=json"],
      input: "test prompt",
      env: { FOO: "bar" },
    };
    expect(args.cmd).toBe("claude");
  });
});
```

**Step 3: Run tests to verify they pass**

Run: `pnpm test -- tests/runtime-types.test.ts`
Expected: PASS (3 tests)

**Step 4: Commit**

```bash
git add src/lib/agent/runtime-types.ts tests/runtime-types.test.ts
git commit -m "feat(runtime): add runtime type definitions"
```

---

### Task 2: Add `buildSpawnArgs` to adapter and unify command building

**Files:**
- Modify: `src/lib/agent/adapter.ts`
- Modify: `tests/agent-adapter.test.ts`

**Step 1: Write failing test for buildSpawnArgs**

Add to `tests/agent-adapter.test.ts`:

```typescript
import { buildSpawnArgs } from "../src/lib/agent/adapter.js";

describe("buildSpawnArgs", () => {
  it("should build spawn args for claude", () => {
    const result = buildSpawnArgs(
      "Test prompt",
      { provider: "claude", model: "sonnet", maxBudgetUsd: 0.5, workingDir: "/tmp/test" },
      { outputFormat: "json", systemPrompt: "You are a test assistant." }
    );
    expect(result.cmd).toBe("claude");
    expect(result.args).toContain("-p");
    expect(result.args).toContain("--output-format=json");
    expect(result.args).toContain("--model=sonnet");
    expect(result.args).toContain("--max-budget-usd=0.5");
    expect(result.args).toContain("--no-session-persistence");
    expect(result.args).toContain("--dangerously-skip-permissions");
    expect(result.input).toContain("[System Instructions]");
    expect(result.input).toContain("Test prompt");
  });

  it("should build spawn args for codex", () => {
    const result = buildSpawnArgs(
      "Test prompt",
      { provider: "codex", model: "gpt-4o" },
      {}
    );
    expect(result.cmd).toBe("codex");
    expect(result.args).toContain("exec");
    expect(result.args).toContain("-m=gpt-4o");
  });

  it("should build spawn args for kimi", () => {
    const result = buildSpawnArgs(
      "Test prompt",
      { provider: "kimi" },
      { outputFormat: "json" }
    );
    expect(result.cmd).toBe("kimi");
    expect(result.args).toContain("--print");
    expect(result.args).toContain("--output-format=stream-json");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/agent-adapter.test.ts`
Expected: FAIL - `buildSpawnArgs` is not exported

**Step 3: Implement buildSpawnArgs in adapter.ts**

Add at the end of `src/lib/agent/adapter.ts` (before closing):

```typescript
import type { SpawnArgs } from "./runtime-types.js";

/**
 * Build unified spawn arguments for any provider.
 * Pure function — no process management, no side effects.
 */
export function buildSpawnArgs(
  prompt: string,
  config: AgentConfig,
  options: AgentOptions
): SpawnArgs {
  if (config.provider === "kimi") {
    const { cmd, args } = buildKimiCommand(prompt, config, options);
    return { cmd, args, env: options.env };
  }

  if (config.provider === "codex") {
    const { cmd, args } = buildCodexCommand(prompt, config, options);
    return { cmd, args, env: options.env };
  }

  // Claude: build args array (not shell string), use stdin for prompt
  const args: string[] = ["-p"];

  if (options.outputFormat === "json") {
    args.push("--output-format=json");
  }
  if (config.model) {
    args.push(`--model=${config.model}`);
  }
  if (config.maxBudgetUsd) {
    args.push(`--max-budget-usd=${config.maxBudgetUsd}`);
  }
  if (config.allowedTools?.length) {
    args.push(`--allowed-tools=${config.allowedTools.join(",")}`);
  }
  if (config.workingDir) {
    args.push(`--add-dir=${resolve(config.workingDir)}`);
  }
  args.push("--no-session-persistence");
  args.push("--dangerously-skip-permissions");

  const systemPrompt = loadSystemPrompt(options);
  const input = systemPrompt
    ? `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${prompt}`
    : prompt;

  return { cmd: "claude", args, input, env: options.env };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/agent-adapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/agent/adapter.ts tests/agent-adapter.test.ts
git commit -m "feat(adapter): add buildSpawnArgs for unified spawn interface"
```

---

### Task 3: Implement run-state persistence

**Files:**
- Create: `src/lib/agent/run-state.ts`
- Test: `tests/run-state.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/run-state.test.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RunState } from "../src/lib/agent/runtime-types.js";
import {
  writeRunState,
  readRunState,
  listActiveRuns,
  cleanOrphanRuns,
  getRunStatePath,
} from "../src/lib/agent/run-state.js";

describe("RunState Persistence", () => {
  let tmpDir: string;
  let techleadDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "techlead-test-"));
    techleadDir = path.join(tmpDir, ".techlead");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeState(overrides: Partial<RunState> = {}): RunState {
    return {
      runId: "run-123",
      taskId: "task-456",
      phase: "exec",
      provider: "claude",
      status: "running",
      pid: process.pid, // use current PID so it's "alive"
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      completedAt: null,
      outputTail: [],
      bytesReceived: 0,
      chunksReceived: 0,
      exitCode: null,
      error: null,
      ...overrides,
    };
  }

  it("should write and read run state", () => {
    const state = makeState();
    writeRunState(state, techleadDir);

    const read = readRunState("task-456", "run-123", techleadDir);
    expect(read).not.toBeNull();
    expect(read!.runId).toBe("run-123");
    expect(read!.status).toBe("running");
  });

  it("should return null for non-existent run", () => {
    const read = readRunState("task-456", "nonexistent", techleadDir);
    expect(read).toBeNull();
  });

  it("should list active runs across tasks", () => {
    writeRunState(makeState({ runId: "run-1", taskId: "task-1", status: "running" }), techleadDir);
    writeRunState(makeState({ runId: "run-2", taskId: "task-2", status: "completed" }), techleadDir);
    writeRunState(makeState({ runId: "run-3", taskId: "task-3", status: "pending" }), techleadDir);

    const active = listActiveRuns(techleadDir);
    expect(active).toHaveLength(2); // running + pending
    expect(active.map((r) => r.runId).sort()).toEqual(["run-1", "run-3"]);
  });

  it("should clean orphan runs with dead PIDs", () => {
    // PID 999999 almost certainly doesn't exist
    writeRunState(makeState({ runId: "run-orphan", pid: 999999 }), techleadDir);

    const cleaned = cleanOrphanRuns(techleadDir);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0]).toBe("run-orphan");

    const state = readRunState("task-456", "run-orphan", techleadDir);
    expect(state!.status).toBe("failed");
    expect(state!.error).toContain("orphan");
  });

  it("should not clean runs with alive PIDs", () => {
    writeRunState(makeState({ pid: process.pid }), techleadDir);

    const cleaned = cleanOrphanRuns(techleadDir);
    expect(cleaned).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/run-state.test.ts`
Expected: FAIL - module not found

**Step 3: Implement run-state.ts**

```typescript
// src/lib/agent/run-state.ts
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

export function readRunState(
  taskId: string,
  runId: string,
  techleadDir: string
): RunState | null {
  const filePath = getRunStatePath(taskId, runId, techleadDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as RunState;
  } catch {
    return null;
  }
}

/**
 * Scan all task directories for active runs (status = running | pending).
 */
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
        const state = JSON.parse(
          fs.readFileSync(path.join(runsDir, file), "utf8")
        ) as RunState;
        if (state.status === "running" || state.status === "pending") {
          active.push(state);
        }
      } catch {
        // skip corrupt files
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

/**
 * Find runs with status running/pending whose PID is dead, mark them failed.
 */
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
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/run-state.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/lib/agent/run-state.ts tests/run-state.test.ts
git commit -m "feat(runtime): add run-state persistence layer"
```

---

### Task 4: Implement RunHandle

**Files:**
- Create: `src/lib/agent/run-handle.ts`
- Test: `tests/run-handle.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/run-handle.test.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RunHandle } from "../src/lib/agent/run-handle.js";

describe("RunHandle", () => {
  let tmpDir: string;
  let techleadDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "techlead-runhandle-"));
    techleadDir = path.join(tmpDir, ".techlead");
    fs.mkdirSync(path.join(techleadDir, "tasks", "task-1", "runs"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should spawn a process and collect output", async () => {
    const handle = RunHandle.spawn(
      { cmd: "echo", args: ["hello world"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );

    expect(handle.runId).toBeTruthy();
    expect(handle.status).toBe("running");

    const result = await handle.result();
    expect(result.success).toBe(true);
    expect(result.content.trim()).toBe("hello world");
    expect(handle.status).toBe("completed");
  });

  it("should handle process failure", async () => {
    const handle = RunHandle.spawn(
      { cmd: "sh", args: ["-c", "exit 1"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );

    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("failed");
  });

  it("should support cancellation", async () => {
    const handle = RunHandle.spawn(
      { cmd: "sleep", args: ["60"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );

    // Give it a moment to start
    await new Promise((r) => setTimeout(r, 100));
    expect(handle.status).toBe("running");

    handle.cancel();
    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("cancelled");
  });

  it("should handle timeout", async () => {
    const handle = RunHandle.spawn(
      { cmd: "sleep", args: ["60"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir, timeoutMs: 200 }
    );

    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("timeout");
  });

  it("should write run state to disk", async () => {
    const handle = RunHandle.spawn(
      { cmd: "echo", args: ["test"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );

    await handle.result();

    const stateFile = path.join(techleadDir, "tasks", "task-1", "runs", `${handle.runId}.json`);
    expect(fs.existsSync(stateFile)).toBe(true);

    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    expect(state.status).toBe("completed");
  });

  it("should provide stdin input to the process", async () => {
    const handle = RunHandle.spawn(
      { cmd: "cat", args: [], input: "hello from stdin", env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );

    const result = await handle.result();
    expect(result.success).toBe(true);
    expect(result.content.trim()).toBe("hello from stdin");
  });

  it("should expose real-time output buffer", async () => {
    const handle = RunHandle.spawn(
      { cmd: "sh", args: ["-c", "echo line1; echo line2; echo line3"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );

    await handle.result();
    expect(handle.output).toContain("line1");
    expect(handle.output).toContain("line3");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/run-handle.test.ts`
Expected: FAIL - module not found

**Step 3: Implement RunHandle**

```typescript
// src/lib/agent/run-handle.ts
import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import type { AgentProvider } from "./adapter.js";
import type { AgentResult } from "./adapter.js";
import type { RunState, RunStatus, SpawnArgs } from "./runtime-types.js";
import { writeRunState } from "./run-state.js";

const OUTPUT_TAIL_LINES = 50;
const DEBOUNCE_MS = 1000;

interface RunHandleOptions {
  taskId: string;
  phase: string;
  provider: AgentProvider;
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
      provider: opts.provider,
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
      cwd: undefined,
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
      // non-fatal: state file write failure shouldn't crash execution
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/run-handle.test.ts`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add src/lib/agent/run-handle.ts tests/run-handle.test.ts
git commit -m "feat(runtime): implement RunHandle with spawn, cancel, timeout"
```

---

### Task 5: Implement AgentRuntime

**Files:**
- Create: `src/lib/agent/runtime.ts`
- Test: `tests/runtime.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/runtime.test.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentRuntime } from "../src/lib/agent/runtime.js";

describe("AgentRuntime", () => {
  let tmpDir: string;
  let techleadDir: string;
  let runtime: AgentRuntime;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "techlead-runtime-"));
    techleadDir = path.join(tmpDir, ".techlead");
    fs.mkdirSync(path.join(techleadDir, "tasks"), { recursive: true });
    runtime = new AgentRuntime(techleadDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should spawn and track a run", async () => {
    const handle = runtime.spawn(
      { cmd: "echo", args: ["hello"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude" }
    );

    expect(runtime.list()).toHaveLength(1);
    expect(runtime.get(handle.runId)).toBe(handle);

    await handle.result();
    // completed runs are still tracked
    expect(runtime.get(handle.runId)).toBe(handle);
  });

  it("should cancel a run by id", async () => {
    const handle = runtime.spawn(
      { cmd: "sleep", args: ["60"], env: {} },
      { taskId: "task-1", phase: "exec", provider: "claude" }
    );

    await new Promise((r) => setTimeout(r, 100));
    runtime.cancel(handle.runId);

    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("cancelled");
  });

  it("should clean orphan runs on init", () => {
    // Write a fake running state with dead PID
    const runsDir = path.join(techleadDir, "tasks", "task-1", "runs");
    fs.mkdirSync(runsDir, { recursive: true });
    fs.writeFileSync(
      path.join(runsDir, "run-dead.json"),
      JSON.stringify({
        runId: "run-dead",
        taskId: "task-1",
        phase: "exec",
        provider: "claude",
        status: "running",
        pid: 999999,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        completedAt: null,
        outputTail: [],
        bytesReceived: 0,
        chunksReceived: 0,
        exitCode: null,
        error: null,
      }),
      "utf8"
    );

    // Creating a new runtime should clean orphans
    const rt = new AgentRuntime(techleadDir);
    const state = JSON.parse(fs.readFileSync(path.join(runsDir, "run-dead.json"), "utf8"));
    expect(state.status).toBe("failed");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/runtime.test.ts`
Expected: FAIL - module not found

**Step 3: Implement AgentRuntime**

```typescript
// src/lib/agent/runtime.ts
import type { AgentProvider } from "./adapter.js";
import { RunHandle } from "./run-handle.js";
import { cleanOrphanRuns } from "./run-state.js";
import type { SpawnArgs } from "./runtime-types.js";

interface SpawnOptions {
  taskId: string;
  phase: string;
  provider: AgentProvider;
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
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/runtime.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/lib/agent/runtime.ts tests/runtime.test.ts
git commit -m "feat(runtime): implement AgentRuntime manager"
```

---

### Task 6: Remove old execution functions from adapter.ts

**Files:**
- Modify: `src/lib/agent/adapter.ts` — delete `executeAgent` and `executeAgentAsync`
- Modify: `tests/agent-adapter.test.ts` — remove/update tests that reference old functions

**Step 1: Delete `executeAgent` (lines 345-497) and `executeAgentAsync` (lines 502-623) from adapter.ts**

Remove these two functions entirely. Keep all other exports unchanged.

**Step 2: Update adapter.ts imports**

Remove `execFileSync` from the import (keep `execSync` for `isAgentAvailable`, keep `spawn` if still needed — actually `spawn` is no longer needed in adapter either, only in run-handle.ts):

```typescript
import { execSync } from "node:child_process";
```

**Step 3: Run type check**

Run: `pnpm typecheck`
Expected: Errors in `commands.ts` — it still imports `executeAgent`. This is expected; we'll fix it in the next task.

**Step 4: Run adapter tests to verify they still pass**

Run: `pnpm test -- tests/agent-adapter.test.ts`
Expected: PASS (existing pure function tests should still work)

**Step 5: Commit**

```bash
git add src/lib/agent/adapter.ts tests/agent-adapter.test.ts
git commit -m "refactor(adapter): remove executeAgent and executeAgentAsync"
```

---

### Task 7: Convert commands.ts to async with AgentRuntime

**Files:**
- Modify: `src/lib/core/commands.ts`
- Modify: `tests/techlead-commands.smoke.test.ts` (if needed)

This is the largest task. The key changes:

**Step 1: Update imports in commands.ts**

Replace:
```typescript
import { ..., executeAgent } from "../agent/adapter.js";
```
With:
```typescript
import { ..., buildSpawnArgs } from "../agent/adapter.js";
import { AgentRuntime } from "../agent/runtime.js";
import { getTechleadDir } from "./paths.js";
```

**Step 2: Convert `executeAgentWithFallback` to async**

```typescript
async function executeAgentWithFallback(
  runtime: AgentRuntime,
  prompt: string,
  primaryConfig: AgentConfig,
  options: AgentOptions,
  fallbackProvider: AgentProvider | null
): Promise<{ result: AgentResult; providerUsed: AgentProvider; usedFallback: boolean }> {
  const spawnArgs = buildSpawnArgs(prompt, primaryConfig, options);
  const handle = runtime.spawn(spawnArgs, {
    taskId: primaryConfig.taskId ?? "unknown",
    phase: "exec",
    provider: primaryConfig.provider,
    model: primaryConfig.model,
    timeoutMs: options.timeoutMs,
  });
  const primaryResult = await handle.result();

  // Parse output if JSON format
  if (options.outputFormat === "json" && primaryResult.success) {
    const parsed = parseOutputForProvider(primaryResult.content, primaryConfig.provider);
    if (parsed) {
      return { result: parsed, providerUsed: primaryConfig.provider, usedFallback: false };
    }
  }

  if (primaryResult.success || !fallbackProvider || fallbackProvider === primaryConfig.provider) {
    return { result: primaryResult, providerUsed: primaryConfig.provider, usedFallback: false };
  }

  // Fallback logic (same pattern, now async)
  console.log(`   ⚠️  Agent '${primaryConfig.provider}' failed, retrying with '${fallbackProvider}'...`);
  const fallbackConfig: AgentConfig = {
    ...primaryConfig,
    provider: fallbackProvider,
    model: defaultModelForProvider(fallbackProvider),
  };
  const fbSpawnArgs = buildSpawnArgs(prompt, fallbackConfig, options);
  const fbHandle = runtime.spawn(fbSpawnArgs, {
    taskId: fallbackConfig.taskId ?? "unknown",
    phase: "exec",
    provider: fallbackProvider,
    model: fallbackConfig.model,
    timeoutMs: options.timeoutMs,
  });
  const fallbackResult = await fbHandle.result();

  if (fallbackResult.success) {
    return { result: fallbackResult, providerUsed: fallbackProvider, usedFallback: true };
  }

  const mergedError = [
    `${primaryConfig.provider}: ${primaryResult.error || "unknown error"}`,
    `${fallbackProvider}: ${fallbackResult.error || "unknown error"}`,
  ].join(" | ");

  return {
    result: { success: false, content: fallbackResult.content || primaryResult.content, error: mergedError },
    providerUsed: fallbackProvider,
    usedFallback: true,
  };
}
```

**Step 3: Convert `executePhaseAgent` to async**

Change signature to `async function executePhaseAgent(...)` and `await` the inner call.

**Step 4: Convert all `cmd*` functions that call `executeAgent` to async**

- `cmdWorld` → `async function cmdWorld()`
- `cmdRun` → `async function cmdRun()`
- `cmdLoop` → `async function cmdLoop(options)` (with `await cmdRun()` in the loop)
- `cmdPlan`/`cmdStart`/`cmdStep`/`cmdReview`/`cmdTest` → async (they call `cmdRun` internally)

Add `AgentRuntime` creation at the top of `cmdRun`:
```typescript
const runtime = new AgentRuntime(getTechleadDir());
```

**Step 5: Add output parsing helper**

```typescript
import { parseClaudeOutput, parseCodexOutput, parseKimiOutput } from "../agent/adapter.js";

function parseOutputForProvider(output: string, provider: AgentProvider): AgentResult | null {
  if (provider === "claude") return parseClaudeOutput(output);
  if (provider === "codex") return parseCodexOutput(output);
  if (provider === "kimi") return parseKimiOutput(output);
  return null;
}
```

**Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (or errors in cli.ts — handled next task)

**Step 7: Commit**

```bash
git add src/lib/core/commands.ts
git commit -m "refactor(commands): convert to async with AgentRuntime"
```

---

### Task 8: Convert cli.ts to async

**Files:**
- Modify: `src/cli.ts`

**Step 1: Make main async and update action handlers**

```typescript
#!/usr/bin/env node

import { cac } from "cac";
import {
  cmdAbort, cmdAdd, cmdDone, cmdHello, cmdInit, cmdList, cmdLoop,
  cmdNext, cmdPlan, cmdReview, cmdRun, cmdStart, cmdStatus, cmdStep, cmdTest, cmdWorld,
} from "./lib/core/commands.js";

async function main(): Promise<void> {
  const cli = cac("techlead");

  cli.command("hello", "Print a hello message").action(cmdHello);
  cli.command("world", "Ask Claude to say hello to the world").action(() => cmdWorld());
  cli.command("init", "Initialize TechLead").action(cmdInit);
  cli.command("add <title>", "Add a new task").action(cmdAdd);
  cli.command("list", "List all tasks").action(cmdList);
  cli.command("status", "Show current status").action(cmdStatus);
  cli.command("plan [taskId]", "Run plan phase for backlog task").action((taskId) => cmdPlan(taskId));
  cli.command("start [taskId]", "Move planned task to exec phase").action((taskId) => cmdStart(taskId));
  cli.command("step [taskId]", "Execute one step in exec phase").action((taskId) => cmdStep(taskId));
  cli.command("review [taskId]", "Run adversarial review phase").action((taskId) => cmdReview(taskId));
  cli.command("test [taskId]", "Run adversarial test phase").action((taskId) => cmdTest(taskId));
  cli.command("done [taskId]", "Mark tested task as done").action(cmdDone);
  cli.command("next", "Switch to next task in queue").action(cmdNext);
  cli.command("run", "Auto-run current/next task by composing phase commands").action(() => cmdRun());
  cli
    .command("loop", "Continuously run tasks until stop conditions are reached")
    .option("--max-cycles <n>", "Maximum number of loop cycles", { default: 20 })
    .option("--max-no-progress <n>", "Stop after N consecutive no-progress cycles", { default: 3 })
    .action((options) => cmdLoop(options));
  cli.command("abort", "Abort current task").action(cmdAbort);

  cli.help();
  cli.parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 2: Run build**

Run: `pnpm build`
Expected: PASS

**Step 3: Run all tests**

Run: `pnpm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "refactor(cli): convert main to async for runtime support"
```

---

### Task 9: Add `techlead watch` command

**Files:**
- Create: `src/lib/core/watch.ts`
- Modify: `src/cli.ts`
- Test: `tests/watch.test.ts`

**Step 1: Write failing test**

```typescript
// tests/watch.test.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatActiveRuns } from "../src/lib/core/watch.js";
import type { RunState } from "../src/lib/agent/runtime-types.js";

describe("Watch", () => {
  it("should format empty active runs", () => {
    const output = formatActiveRuns([]);
    expect(output).toContain("No active runs");
  });

  it("should format active runs into a table", () => {
    const runs: RunState[] = [
      {
        runId: "run-abc",
        taskId: "task-1",
        phase: "exec",
        provider: "claude",
        status: "running",
        pid: 12345,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        completedAt: null,
        outputTail: ["doing work..."],
        bytesReceived: 1024,
        chunksReceived: 10,
        exitCode: null,
        error: null,
      },
    ];
    const output = formatActiveRuns(runs);
    expect(output).toContain("run-abc");
    expect(output).toContain("task-1");
    expect(output).toContain("running");
    expect(output).toContain("doing work...");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/watch.test.ts`
Expected: FAIL

**Step 3: Implement watch.ts**

```typescript
// src/lib/core/watch.ts
import fs from "node:fs";
import type { RunState } from "../agent/runtime-types.js";
import { listActiveRuns, readRunState } from "../agent/run-state.js";
import { getTechleadDir } from "./paths.js";

export function formatActiveRuns(runs: RunState[]): string {
  if (runs.length === 0) {
    return "No active runs.";
  }

  const lines: string[] = [];
  lines.push("Run ID          Task       Phase   Provider  Status   Last Output");
  lines.push("-".repeat(80));

  for (const run of runs) {
    const lastOutput = run.outputTail.length > 0
      ? run.outputTail[run.outputTail.length - 1].substring(0, 40)
      : "-";
    lines.push(
      `${run.runId.padEnd(16)} ${run.taskId.padEnd(10)} ${run.phase.padEnd(7)} ${run.provider.padEnd(9)} ${run.status.padEnd(8)} ${lastOutput}`
    );
  }

  return lines.join("\n");
}

export function cmdWatch(options: { follow?: boolean; run?: string }): void {
  const techleadDir = getTechleadDir();

  if (options.run) {
    // Show specific run — scan for it
    const runs = listActiveRuns(techleadDir);
    const run = runs.find((r) => r.runId === options.run);
    if (!run) {
      console.log(`Run ${options.run} not found among active runs.`);
      return;
    }
    console.log(JSON.stringify(run, null, 2));
    return;
  }

  const runs = listActiveRuns(techleadDir);
  console.log(formatActiveRuns(runs));

  if (options.follow) {
    console.log("\nWatching for changes... (Ctrl+C to stop)\n");
    const tasksDir = `${techleadDir}/tasks`;
    if (!fs.existsSync(tasksDir)) return;

    const interval = setInterval(() => {
      const current = listActiveRuns(techleadDir);
      process.stdout.write("\x1B[2J\x1B[H"); // clear screen
      console.log(formatActiveRuns(current));
    }, 2000);

    process.on("SIGINT", () => {
      clearInterval(interval);
      process.exit(0);
    });
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/watch.test.ts`
Expected: PASS

**Step 5: Register command in cli.ts**

Add to cli.ts:
```typescript
import { cmdWatch } from "./lib/core/watch.js";

cli
  .command("watch", "Watch active agent runs")
  .option("--follow, -f", "Continuously watch for changes")
  .option("--run <runId>", "Show specific run details")
  .action((options) => cmdWatch(options));
```

**Step 6: Commit**

```bash
git add src/lib/core/watch.ts tests/watch.test.ts src/cli.ts
git commit -m "feat(cli): add techlead watch command"
```

---

### Task 10: Add `techlead cancel` command

**Files:**
- Create: `src/lib/core/cancel.ts`
- Modify: `src/cli.ts`
- Test: `tests/cancel.test.ts`

**Step 1: Write failing test**

```typescript
// tests/cancel.test.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cancelRun } from "../src/lib/core/cancel.js";
import type { RunState } from "../src/lib/agent/runtime-types.js";
import { writeRunState } from "../src/lib/agent/run-state.js";

describe("Cancel", () => {
  let tmpDir: string;
  let techleadDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "techlead-cancel-"));
    techleadDir = path.join(tmpDir, ".techlead");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should mark a run as cancelled when PID is dead", () => {
    const state: RunState = {
      runId: "run-cancel",
      taskId: "task-1",
      phase: "exec",
      provider: "claude",
      status: "running",
      pid: 999999,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      completedAt: null,
      outputTail: [],
      bytesReceived: 0,
      chunksReceived: 0,
      exitCode: null,
      error: null,
    };
    writeRunState(state, techleadDir);

    const result = cancelRun("run-cancel", techleadDir);
    expect(result.success).toBe(true);
  });

  it("should return error for non-existent run", () => {
    const result = cancelRun("nonexistent", techleadDir);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/cancel.test.ts`
Expected: FAIL

**Step 3: Implement cancel.ts**

```typescript
// src/lib/core/cancel.ts
import { listActiveRuns, readRunState, writeRunState } from "../agent/run-state.js";
import { getTechleadDir } from "./paths.js";

export function cancelRun(
  runId: string,
  techleadDir?: string
): { success: boolean; error?: string } {
  const dir = techleadDir ?? getTechleadDir();
  const active = listActiveRuns(dir);
  const run = active.find((r) => r.runId === runId);

  if (!run) {
    return { success: false, error: `Run ${runId} not found among active runs` };
  }

  // Try to kill the process
  if (run.pid) {
    try {
      process.kill(run.pid, "SIGTERM");
      // Give it 15 seconds then SIGKILL
      setTimeout(() => {
        try {
          process.kill(run.pid!, "SIGKILL");
        } catch {
          // already dead
        }
      }, 15000);
    } catch {
      // Process already dead
    }
  }

  run.status = "cancelled";
  run.completedAt = new Date().toISOString();
  run.error = "Cancelled by user";
  writeRunState(run, dir);

  return { success: true };
}

export function cmdCancel(runId?: string): void {
  const techleadDir = getTechleadDir();
  const active = listActiveRuns(techleadDir);

  if (active.length === 0) {
    console.log("No active runs to cancel.");
    return;
  }

  const targetId = runId ?? (active.length === 1 ? active[0].runId : undefined);

  if (!targetId) {
    console.log("Multiple active runs. Specify a run ID:");
    for (const run of active) {
      console.log(`  ${run.runId}  (task: ${run.taskId}, phase: ${run.phase})`);
    }
    return;
  }

  const result = cancelRun(targetId, techleadDir);
  if (result.success) {
    console.log(`Cancelled run ${targetId}`);
  } else {
    console.error(`Failed to cancel: ${result.error}`);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/cancel.test.ts`
Expected: PASS

**Step 5: Register command in cli.ts**

```typescript
import { cmdCancel } from "./lib/core/cancel.js";

cli.command("cancel [runId]", "Cancel an active agent run").action((runId) => cmdCancel(runId));
```

**Step 6: Run full test suite and build**

Run: `pnpm build && pnpm test`
Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/core/cancel.ts tests/cancel.test.ts src/cli.ts
git commit -m "feat(cli): add techlead cancel command"
```

---

### Task 11: Final verification and cleanup

**Files:**
- All modified files

**Step 1: Run full build**

Run: `pnpm build`
Expected: PASS, no type errors

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any issues)

**Step 4: Run check:all**

Run: `pnpm check:all`
Expected: PASS

**Step 5: Manual smoke test**

```bash
pnpm dev -- run         # should start async execution
# In another terminal:
cat .techlead/tasks/*/runs/*.json  # should see real-time state
pnpm dev -- watch       # should show active runs
pnpm dev -- cancel      # should terminate running agent
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: cleanup and verify runtime layer refactor"
```
