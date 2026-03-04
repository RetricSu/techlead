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
      { cmd: "echo", args: ["hello world"] },
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
      { cmd: "sh", args: ["-c", "exit 1"] },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );
    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("failed");
  });

  it("should support cancellation", async () => {
    const handle = RunHandle.spawn(
      { cmd: "sleep", args: ["60"] },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(handle.status).toBe("running");
    handle.cancel();
    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("cancelled");
  });

  it("should handle timeout", async () => {
    const handle = RunHandle.spawn(
      { cmd: "sleep", args: ["60"] },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir, timeoutMs: 200 }
    );
    const result = await handle.result();
    expect(result.success).toBe(false);
    expect(handle.status).toBe("timeout");
  });

  it("should write run state to disk", async () => {
    const handle = RunHandle.spawn(
      { cmd: "echo", args: ["test"] },
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
      { cmd: "cat", args: [], input: "hello from stdin" },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );
    const result = await handle.result();
    expect(result.success).toBe(true);
    expect(result.content.trim()).toBe("hello from stdin");
  });

  it("should expose real-time output buffer", async () => {
    const handle = RunHandle.spawn(
      { cmd: "sh", args: ["-c", "echo line1; echo line2; echo line3"] },
      { taskId: "task-1", phase: "exec", provider: "claude", techleadDir }
    );
    await handle.result();
    expect(handle.output).toContain("line1");
    expect(handle.output).toContain("line3");
  });
});
