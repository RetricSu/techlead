import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RunState } from "../../src/lib/agent/runtime-types.js";
import {
  writeRunState,
  readRunState,
  listActiveRuns,
  cleanOrphanRuns,
} from "../../src/lib/agent/run-state.js";

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
      pid: process.pid,
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
    writeRunState(
      makeState({ runId: "run-2", taskId: "task-2", status: "completed" }),
      techleadDir
    );
    writeRunState(makeState({ runId: "run-3", taskId: "task-3", status: "pending" }), techleadDir);
    const active = listActiveRuns(techleadDir);
    expect(active).toHaveLength(2);
    expect(active.map((r) => r.runId).sort()).toEqual(["run-1", "run-3"]);
  });

  it("should clean orphan runs with dead PIDs", () => {
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
