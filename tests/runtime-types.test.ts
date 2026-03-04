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
    const statuses: RunStatus[] = [
      "pending",
      "running",
      "completed",
      "failed",
      "cancelled",
      "timeout",
    ];
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
