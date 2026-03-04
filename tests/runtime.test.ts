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
      { cmd: "echo", args: ["hello"] },
      { taskId: "task-1", phase: "exec", provider: "claude" }
    );
    expect(runtime.list()).toHaveLength(1);
    expect(runtime.get(handle.runId)).toBe(handle);
    await handle.result();
    expect(runtime.get(handle.runId)).toBe(handle);
  });

  it("should cancel a run by id", async () => {
    const handle = runtime.spawn(
      { cmd: "sleep", args: ["60"] },
      { taskId: "task-1", phase: "exec", provider: "claude" }
    );
    await new Promise((r) => setTimeout(r, 100));
    runtime.cancel(handle.runId);
    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("cancelled");
  });

  it("should clean orphan runs on init", () => {
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
    new AgentRuntime(techleadDir);
    const state = JSON.parse(fs.readFileSync(path.join(runsDir, "run-dead.json"), "utf8"));
    expect(state.status).toBe("failed");
  });

  it("should return false when cancelling non-existent run", () => {
    expect(runtime.cancel("nonexistent")).toBe(false);
  });
});
