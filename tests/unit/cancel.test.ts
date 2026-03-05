import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cancelRun } from "../../src/lib/core/cancel.js";
import type { RunState } from "../../src/lib/agent/runtime-types.js";
import { writeRunState } from "../../src/lib/agent/run-state.js";

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
