import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentConfig, AgentOptions, AgentResult } from "../../src/lib/agent/adapter.js";

const executeAgentMock = vi.hoisted(() =>
  vi.fn<(prompt: string, config: AgentConfig, options?: AgentOptions) => AgentResult>()
);
const detectAgentMock = vi.hoisted(() => vi.fn<() => "claude" | "codex" | null>());
const isAgentAvailableMock = vi.hoisted(() => vi.fn<(provider: "claude" | "codex") => boolean>());

vi.mock("../src/lib/agent/adapter.js", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/agent/adapter.js")>(
    "../src/lib/agent/adapter.js"
  );
  return {
    ...actual,
    executeAgent: executeAgentMock,
    detectAgent: detectAgentMock,
    isAgentAvailable: isAgentAvailableMock,
  };
});

import { cmdAbort, cmdAdd, cmdDone, cmdInit, cmdRun } from "../../src/lib/core/commands.js";

function readTaskJson(cwd: string): Record<string, unknown> {
  const tasksDir = path.join(cwd, ".techlead", "tasks");
  const taskDirs = fs.readdirSync(tasksDir);
  const taskPath = path.join(tasksDir, taskDirs[0], "task.json");
  return JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
}

function getTaskDirPath(cwd: string): string {
  const tasksDir = path.join(cwd, ".techlead", "tasks");
  const taskDirs = fs.readdirSync(tasksDir);
  return path.join(tasksDir, taskDirs[0]);
}

function setTaskDone(taskPath: string, extra: Record<string, unknown> = {}): void {
  const task = JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
  task.status = "done";
  task.phase = "completed";
  task.review_passed = true;
  task.test_passed = true;
  task.completed_at = new Date().toISOString();
  Object.assign(task, extra);
  fs.writeFileSync(taskPath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
}

describe("done invariants — state cannot be bypassed", () => {
  const originalCwd = process.cwd();
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "techlead-done-invariants-"));
    process.chdir(tempDir);
    executeAgentMock.mockReset();
    detectAgentMock.mockReset();
    isAgentAvailableMock.mockReset();
    detectAgentMock.mockReturnValue("claude");
    isAgentAvailableMock.mockImplementation(() => true);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Invariant 1: Status immutability — cmdAbort cannot downgrade a done task
  it("invariant 1: cmdAbort does not change done task status to failed", () => {
    cmdInit();
    cmdAdd("abort on done");

    const taskDir = getTaskDirPath(tempDir);
    const taskPath = path.join(taskDir, "task.json");
    setTaskDone(taskPath);

    // Point current.json at the done task (as if stale)
    const currentPath = path.join(tempDir, ".techlead", "current.json");
    fs.writeFileSync(
      currentPath,
      `${JSON.stringify({ task_id: "T-001", phase: "completed" }, null, 2)}\n`,
      "utf8"
    );

    const errSpy = vi.spyOn(console, "error");
    cmdAbort();
    errSpy.mockRestore();

    const after = readTaskJson(tempDir);
    expect(after.status).toBe("done");
    expect(after.phase).toBe("completed");
  });

  // Invariant 2: Phase skip prevention — cmdDone rejects task not in testing/test_passed
  it("invariant 2: cmdDone rejects done attempt on in_progress/exec task", () => {
    cmdInit();
    cmdAdd("phase skip attempt");

    const taskDir = getTaskDirPath(tempDir);
    const taskPath = path.join(taskDir, "task.json");
    const task = JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
    task.status = "in_progress";
    task.phase = "exec";
    fs.writeFileSync(taskPath, `${JSON.stringify(task, null, 2)}\n`, "utf8");

    const errSpy = vi.spyOn(console, "error");
    cmdDone("T-001");
    errSpy.mockRestore();

    const after = readTaskJson(tempDir);
    expect(after.status).toBe("in_progress");
    expect(after.phase).toBe("exec");
  });

  // Invariant 3: Acceptance criteria gate — cmdDone rejects task with unchecked criteria
  it("invariant 3: cmdDone rejects task with unchecked acceptance criteria", () => {
    cmdInit();
    cmdAdd("unchecked criteria task");

    const taskDir = getTaskDirPath(tempDir);
    const taskPath = path.join(taskDir, "task.json");
    const task = JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
    task.status = "testing";
    task.phase = "test";
    task.test_passed = true;
    task.review_passed = true;
    fs.writeFileSync(taskPath, `${JSON.stringify(task, null, 2)}\n`, "utf8");

    // README has unchecked criteria (written by cmdAdd)
    const readmePath = path.join(taskDir, "README.md");
    const readme = fs.readFileSync(readmePath, "utf8");
    expect(readme).toContain("- [ ]"); // confirm unchecked criteria exist

    const errSpy = vi.spyOn(console, "error");
    cmdDone("T-001");
    errSpy.mockRestore();

    const after = readTaskJson(tempDir);
    expect(after.status).toBe("testing"); // must not advance to done
  });

  // Invariant 4: Auto-retry exclusion — done tasks never re-queued by cmdRun
  it("invariant 4: cmdRun never re-executes a done task even with auto_retry_failed config", () => {
    cmdInit();
    cmdAdd("done auto-retry guard");

    const taskDir = getTaskDirPath(tempDir);
    const taskPath = path.join(taskDir, "task.json");
    setTaskDone(taskPath);

    // Write config with auto_retry_failed: true
    const configPath = path.join(tempDir, ".techlead", "config.yaml");
    fs.writeFileSync(
      configPath,
      [
        "agent:",
        "  provider: claude",
        "  model: sonnet",
        "task:",
        "  auto_retry_failed: true",
      ].join("\n"),
      "utf8"
    );

    // cmdRun should not invoke the agent for a done task
    cmdRun();

    expect(executeAgentMock).not.toHaveBeenCalled();

    const after = readTaskJson(tempDir);
    expect(after.status).toBe("done");
  });

  // Invariant 5: current.json integrity — stale pointer to done task is cleared with warning
  it("invariant 5: cmdRun clears stale current.json pointing to a done task", () => {
    cmdInit();
    cmdAdd("stale current test");

    const taskDir = getTaskDirPath(tempDir);
    const taskPath = path.join(taskDir, "task.json");
    setTaskDone(taskPath);

    // Artificially point current.json at the done task
    const currentPath = path.join(tempDir, ".techlead", "current.json");
    fs.writeFileSync(
      currentPath,
      `${JSON.stringify({ task_id: "T-001", phase: "completed" }, null, 2)}\n`,
      "utf8"
    );

    cmdRun();

    // After cmdRun, current.json should no longer point to the done task
    const currentAfter = JSON.parse(fs.readFileSync(currentPath, "utf8")) as {
      task_id: string | null;
    };
    expect(currentAfter.task_id).toBeNull();
  });
});
