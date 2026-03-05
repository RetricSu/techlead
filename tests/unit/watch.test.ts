import { describe, expect, it } from "vitest";
import { formatActiveRuns } from "../../src/lib/core/watch.js";
import type { RunState } from "../../src/lib/agent/runtime-types.js";

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
