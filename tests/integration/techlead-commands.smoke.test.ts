import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentResult } from "../../src/lib/agent/adapter.js";

const detectAgentMock = vi.hoisted(() => vi.fn<() => "claude" | "codex" | null>());
const isAgentAvailableMock = vi.hoisted(() => vi.fn<(provider: "claude" | "codex") => boolean>());

// Track spawn calls for assertions
const spawnCalls: Array<{ spawnArgs: unknown; opts: unknown }> = [];
// Queue of results for successive spawn calls
let resultQueue: AgentResult[] = [];
// Queue of side effects to run when spawn is called (before result resolves)
let sideEffectQueue: Array<(() => void) | null> = [];

vi.mock("../../src/lib/agent/adapter.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/agent/adapter.js")>(
    "../../src/lib/agent/adapter.js"
  );
  return {
    ...actual,
    detectAgent: detectAgentMock,
    isAgentAvailable: isAgentAvailableMock,
  };
});

vi.mock("../../src/lib/agent/runtime.js", () => {
  return {
    AgentRuntime: class MockAgentRuntime {
      spawn(spawnArgs: unknown, opts: unknown) {
        spawnCalls.push({ spawnArgs, opts });
        const sideEffect = sideEffectQueue.shift();
        if (sideEffect) sideEffect();
        const nextResult = resultQueue.shift() ?? {
          success: false,
          content: "",
          error: "no mock result queued",
        };
        return {
          runId: `mock-run-${spawnCalls.length}`,
          result: () => Promise.resolve(nextResult),
        };
      }
    },
  };
});

import { cmdAdd, cmdDone, cmdInit, cmdRun } from "../../src/lib/core/commands.js";

function readTaskJson(cwd: string): Record<string, unknown> {
  const tasksDir = path.join(cwd, ".techlead", "tasks");
  const taskDirs = fs.readdirSync(tasksDir);
  const taskPath = path.join(tasksDir, taskDirs[0], "task.json");
  return JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
}

function getTaskDir(cwd: string): string {
  const tasksDir = path.join(cwd, ".techlead", "tasks");
  const taskDirs = fs.readdirSync(tasksDir);
  return path.join(tasksDir, taskDirs[0]);
}

describe("techlead commands smoke", () => {
  const originalCwd = process.cwd();
  const MOCK_COMPLETED_AT = "2024-03-03T13:00:00.000Z";
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "techlead-commands-smoke-"));
    process.chdir(tempDir);
    spawnCalls.length = 0;
    resultQueue = [];
    sideEffectQueue = [];
    detectAgentMock.mockReset();
    isAgentAvailableMock.mockReset();
    detectAgentMock.mockReturnValue("claude");
    isAgentAvailableMock.mockImplementation(() => true);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("completes one task end-to-end and creates phase artifacts", async () => {
    cmdInit();
    cmdAdd("smoke task");

    // Plan phase does not use outputFormat: "json", so raw content is used as-is
    // Exec/review/test phases use outputFormat: "json", so content is re-parsed by parseClaudeOutput
    // which expects valid JSON with {subtype, result, is_error} shape
    const execJson = JSON.stringify({
      subtype: "success",
      is_error: false,
      result: 'Step done\n\n<!-- STATUS: {"completed": true} -->',
    });
    const reviewJson = JSON.stringify({
      subtype: "success",
      is_error: false,
      result: 'Review passed\n\n<!-- VERDICT: {"result": "PASS", "critical_count": 0} -->',
    });
    const testJson = JSON.stringify({
      subtype: "success",
      is_error: false,
      result: 'Test passed\n\n<!-- VERDICT: {"result": "PASS", "critical_count": 0} -->',
    });

    resultQueue = [
      { success: true, content: "Plan generated" },
      { success: true, content: execJson },
      { success: true, content: reviewJson },
      { success: true, content: testJson },
    ];

    await cmdRun(); // backlog -> plan
    await cmdRun(); // plan -> exec transition
    await cmdRun(); // exec step + review + test + done

    const task = readTaskJson(tempDir);
    const taskDir = getTaskDir(tempDir);

    expect(task.status).toBe("done");
    expect(task.phase).toBe("completed");
    expect(fs.existsSync(path.join(taskDir, "plan", "discussion.md"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "plan", "plan.md"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "work-log.md"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "review", "reviewer-1.md"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "test", "adversarial-test.md"))).toBe(true);
    expect(spawnCalls.length).toBe(4);
  });

  it("uses configured provider and falls back to secondary provider on failure", async () => {
    cmdInit();
    cmdAdd("fallback task");

    fs.writeFileSync(
      path.join(tempDir, ".techlead", "config.yaml"),
      [
        "agent:",
        "  provider: claude",
        "  model: opus",
        "  timeout_ms: 120000",
        "  max_budget_usd: 3",
      ].join("\n"),
      "utf8"
    );

    resultQueue = [
      { success: false, content: "", error: "primary provider failed" },
      { success: true, content: "Plan generated by fallback" },
    ];

    await cmdRun();

    const task = readTaskJson(tempDir);

    expect(detectAgentMock).not.toHaveBeenCalled();
    expect(spawnCalls.length).toBe(2);
    expect((spawnCalls[0].opts as Record<string, unknown>).provider).toBe("claude");
    expect((spawnCalls[0].opts as Record<string, unknown>).model).toBe("opus");
    expect((spawnCalls[1].opts as Record<string, unknown>).provider).toBe("codex");
    expect((spawnCalls[1].opts as Record<string, unknown>).model).toBe("gpt-4o");
    expect(task.status).toBe("in_progress");
    expect(task.phase).toBe("plan");
  });

  it("repairs invalid done state before execution and prevents false completion", async () => {
    cmdInit();
    cmdAdd("repair invalid done");

    const taskDir = getTaskDir(tempDir);
    const taskPath = path.join(taskDir, "task.json");
    const task = JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
    task.status = "done";
    task.phase = "exec";
    task.review_passed = false;
    task.test_passed = false;
    task.completed_at = MOCK_COMPLETED_AT;
    fs.writeFileSync(taskPath, `${JSON.stringify(task, null, 2)}\n`, "utf8");

    // Exec phase uses outputFormat: "json", so content must be valid Claude JSON
    const execJson = JSON.stringify({
      subtype: "success",
      is_error: false,
      result: 'Working\n\n<!-- STATUS: {"completed": false} -->',
    });
    resultQueue = [{ success: true, content: execJson }];

    await cmdRun();

    const repaired = readTaskJson(tempDir);
    expect(repaired.status).toBe("in_progress");
    expect(repaired.phase).toBe("exec");
    expect(repaired.completed_at).toBeNull();
    expect(spawnCalls.length).toBe(1);
  });

  it("rejects task state mutation written by agent during exec", async () => {
    cmdInit();
    cmdAdd("mutation guard");

    // Plan phase: no outputFormat: "json"
    resultQueue = [{ success: true, content: "Plan generated" }];

    // First cmdRun: plan phase (backlog -> in_progress/plan)
    await cmdRun();
    // Second cmdRun: transition plan->exec, no agent call needed
    await cmdRun();

    const taskDir = getTaskDir(tempDir);
    const taskPath = path.join(taskDir, "task.json");

    // Exec phase uses outputFormat: "json", so content must be valid Claude JSON
    const execJson = JSON.stringify({
      subtype: "success",
      is_error: false,
      result: 'Still running\n\n<!-- STATUS: {"completed": false} -->',
    });
    resultQueue = [{ success: true, content: execJson }];

    // Use side effect to mutate task file DURING spawn (simulates agent writing)
    sideEffectQueue = [
      () => {
        const raw = JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
        raw.status = "done";
        raw.phase = "exec";
        raw.completed_at = MOCK_COMPLETED_AT;
        raw.review_passed = true;
        raw.test_passed = true;
        raw.review_attempts = 999;
        raw.test_attempts = 999;
        fs.writeFileSync(taskPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      },
    ];

    await cmdRun();

    const guarded = readTaskJson(tempDir);
    expect(guarded.status).toBe("in_progress");
    expect(guarded.phase).toBe("exec");
    expect(guarded.completed_at).toBeNull();
    expect(guarded.review_passed).not.toBe(true);
    expect(guarded.test_passed).not.toBe(true);
    expect((guarded.review_attempts as number) ?? 0).toBe(0);
    expect((guarded.test_attempts as number) ?? 0).toBe(0);
  });

  it("blocks cmdDone when review gate has not passed", () => {
    cmdInit();
    cmdAdd("done guard");

    const taskDir = getTaskDir(tempDir);
    const taskPath = path.join(taskDir, "task.json");
    const task = JSON.parse(fs.readFileSync(taskPath, "utf8")) as Record<string, unknown>;
    task.status = "testing";
    task.phase = "test";
    task.test_passed = true;
    task.review_passed = false;
    fs.writeFileSync(taskPath, `${JSON.stringify(task, null, 2)}\n`, "utf8");

    cmdDone("T-001");

    const after = readTaskJson(tempDir);
    expect(after.status).toBe("testing");
    expect(after.phase).toBe("test");
  });
});
