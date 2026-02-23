#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const VALID_STATES = new Set(["Backlog", "In Progress", "Review", "Testing", "Failed", "Done"]);
const DEFAULT_MAX_WORKERS = 4;
const DEFAULT_LOG_DIR = ".va-auto-pilot/parallel-runs";

function stripYamlValue(value) {
  return value.replace(/^["']/, "").replace(/["']$/, "").trim();
}

function readSprintPathsFromConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const sprint = {};
  let inSprint = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const sectionMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*$/);
    if (sectionMatch) {
      inSprint = sectionMatch[1] === "sprint";
      continue;
    }

    if (!inSprint) continue;

    const keyMatch = line.match(/^\s{2}([A-Za-z][A-Za-z0-9_-]*):\s*(.+)\s*$/);
    if (!keyMatch) continue;

    const key = keyMatch[1];
    const value = stripYamlValue(keyMatch[2]);
    sprint[key] = value;
  }

  return sprint;
}

const sprintFromConfig = readSprintPathsFromConfig(
  path.resolve(process.cwd(), ".va-auto-pilot/config.yaml")
);

const DEFAULTS = {
  stateFile:
    process.env.AUTO_PILOT_SPRINT_STATE_FILE ??
    sprintFromConfig.stateFile ??
    ".va-auto-pilot/sprint-state.json",
  boardFile:
    process.env.AUTO_PILOT_SPRINT_BOARD_FILE ??
    sprintFromConfig.boardFile ??
    "docs/todo/sprint.md",
  journalFile:
    process.env.AUTO_PILOT_RUN_JOURNAL_FILE ??
    sprintFromConfig.runJournalFile ??
    "docs/todo/run-journal.md"
};

function printHelp() {
  console.log(`va-parallel-runner (experimental)

This helper is opt-in. Default VA Auto-Pilot path is model-native parallel orchestration + gate synchronization.

Usage:
  node scripts/va-parallel-runner.mjs spawn --plan-file <path> [options]

Options:
  --plan-file <path>          Parallel plan JSON from sprint-board plan command
  --agent-cmd <template>      Command template for tracks, supports {taskId}
  --max-workers <n>           Max concurrent track workers (default: ${DEFAULT_MAX_WORKERS})
  --log-dir <path>            Track log directory (default: ${DEFAULT_LOG_DIR})
  --state-file <path>         Sprint state file path
  --board-file <path>         Sprint board markdown path
  --journal-file <path>       Run journal path
  --skip-state-update         Do not write task state updates
  --dry-run                   Print planned commands, do not execute
  --json                      Print result as JSON
  --help                      Show help

Plan shape:
{
  "primaryTaskId": "AP-001",
  "parallelTracks": ["AP-002", {"taskId":"AP-003","command":"..."}],
  "dependencyGraph": {"AP-002":[],"AP-003":["AP-001"]},
  "syncPoints": ["quality-gates"]
}
`);
}

function parseArgv(argv) {
  const parsed = {
    command: argv[0] ?? "",
    options: {},
    flags: new Set()
  };

  let i = 1;
  while (i < argv.length) {
    const token = argv[i];

    if (!token.startsWith("--")) {
      i += 1;
      continue;
    }

    if (token === "--json" || token === "--help" || token === "--dry-run" || token === "--skip-state-update") {
      parsed.flags.add(token.slice(2));
      i += 1;
      continue;
    }

    if (token.includes("=")) {
      const [key, value] = token.slice(2).split("=");
      parsed.options[key] = value ?? "";
      i += 1;
      continue;
    }

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed.options[key] = value;
    i += 2;
  }

  return parsed;
}

function nowIso() {
  return new Date().toISOString();
}

function requireOption(options, key) {
  const value = options[key];
  if (!value) {
    throw new Error(`Missing required option --${key}`);
  }
  return value;
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeTrack(track) {
  if (typeof track === "string") {
    return { taskId: track, command: "" };
  }

  if (track && typeof track === "object" && typeof track.taskId === "string") {
    return {
      taskId: track.taskId,
      command: typeof track.command === "string" ? track.command : ""
    };
  }

  throw new Error("Invalid parallel track entry. Expected string taskId or object with taskId.");
}

function readPlan(planFile) {
  const raw = readJsonFile(planFile);
  const tracks = Array.isArray(raw.parallelTracks) ? raw.parallelTracks.map(normalizeTrack) : [];
  return {
    primaryTaskId: String(raw.primaryTaskId ?? ""),
    primaryAction: String(raw.primaryAction ?? ""),
    parallelTracks: tracks,
    dependencyGraph:
      raw.dependencyGraph && typeof raw.dependencyGraph === "object" ? raw.dependencyGraph : {},
    syncPoints: Array.isArray(raw.syncPoints) ? raw.syncPoints.map((item) => String(item)) : []
  };
}

function buildTrackCommand(track, agentTemplate) {
  if (track.command) return track.command;
  if (!agentTemplate) {
    throw new Error(
      `Track ${track.taskId} is missing command and no --agent-cmd template was provided.`
    );
  }
  return agentTemplate.includes("{taskId}")
    ? agentTemplate.replaceAll("{taskId}", track.taskId)
    : agentTemplate;
}

function appendLog(logFile, message) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, message, "utf8");
}

function runTrack(track, command, logFile) {
  const startedAt = Date.now();
  appendLog(
    logFile,
    `[${nowIso()}] task=${track.taskId}\ncommand: ${command}\n---\n`
  );

  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], {
      env: { ...process.env, VA_TASK_ID: track.taskId }
    });

    child.stdout.on("data", (chunk) => {
      appendLog(logFile, chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      appendLog(logFile, chunk.toString());
    });

    child.on("close", (code, signal) => {
      const durationMs = Date.now() - startedAt;
      appendLog(
        logFile,
        `\n---\n[${nowIso()}] exit code=${code ?? -1} signal=${signal ?? "-"} durationMs=${durationMs}\n`
      );
      resolve({
        taskId: track.taskId,
        command,
        success: code === 0,
        exitCode: code ?? -1,
        signal: signal ?? "",
        durationMs,
        logFile
      });
    });
  });
}

async function runWithWorkerPool(items, maxWorkers, worker) {
  const results = Array(items.length);
  let cursor = 0;

  async function workerLoop() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(maxWorkers, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => workerLoop()));
  return results;
}

function normalizeStateTask(task) {
  return {
    ...task,
    id: String(task.id ?? ""),
    state: String(task.state ?? "Backlog"),
    failCount: Number(task.failCount ?? 0),
    reason: String(task.reason ?? ""),
    startedAt: String(task.startedAt ?? ""),
    lastFailedAt: String(task.lastFailedAt ?? "")
  };
}

function readState(stateFile) {
  const raw = readJsonFile(stateFile);
  if (!Array.isArray(raw.tasks)) {
    throw new Error("Invalid sprint state file: tasks must be an array");
  }
  raw.tasks = raw.tasks.map(normalizeStateTask);
  return raw;
}

function renderBoard(stateFile, boardFile) {
  const sprintBoardScript = path.resolve(process.cwd(), "scripts/sprint-board.mjs");
  if (!fs.existsSync(sprintBoardScript)) return;

  const child = spawn("node", [sprintBoardScript, "render", "--state-file", stateFile, "--board-file", boardFile], {
    stdio: "ignore"
  });

  return new Promise((resolve) => {
    child.on("close", () => resolve());
    child.on("error", () => resolve());
  });
}

function appendJournalEntry(journalFile, payload) {
  const lines = [];
  lines.push(`## ${nowIso()} - parallel-runner`);
  lines.push(
    `- Summary: synchronized ${payload.results.length} parallel track(s) before quality gates.`
  );
  lines.push(`- Primary Task: ${payload.primaryTaskId || "-"}`);
  lines.push(
    `- Tracks: ${payload.results.map((item) => `${item.taskId}:${item.success ? "PASS" : "FAIL"}`).join(", ")}`
  );
  if (payload.syncPoints.length > 0) {
    lines.push(`- Sync Points: ${payload.syncPoints.join(", ")}`);
  }
  lines.push("- Files:");
  for (const result of payload.results) {
    lines.push(`  - \`${result.logFile}\``);
  }
  lines.push("---");

  fs.mkdirSync(path.dirname(journalFile), { recursive: true });
  const prefix = fs.existsSync(journalFile)
    ? "\n"
    : "# Run Journal\n\n## Codebase Signals\n- Add reusable patterns and gotchas here.\n\n## Entries\n";
  fs.appendFileSync(journalFile, `${prefix}${lines.join("\n")}\n`, "utf8");
}

function applyStateTransitions(state, tracks, resultsByTaskId) {
  const tasksById = new Map(state.tasks.map((task) => [task.id, task]));
  const timestamp = nowIso();
  const runnableStates = new Set(["Backlog", "In Progress"]);
  const mutableTaskIds = new Set();

  for (const track of tracks) {
    const task = tasksById.get(track.taskId);
    if (!task) continue;
    if (!VALID_STATES.has(task.state) || !runnableStates.has(task.state)) continue;
    mutableTaskIds.add(track.taskId);
    if (task.state === "Backlog") {
      task.state = "In Progress";
      if (!task.startedAt) task.startedAt = timestamp;
    }
  }

  for (const track of tracks) {
    if (!mutableTaskIds.has(track.taskId)) continue;

    const task = tasksById.get(track.taskId);
    const result = resultsByTaskId.get(track.taskId);
    if (!task || !result) continue;

    if (result.success) {
      task.state = "Review";
      task.reason = "";
      continue;
    }

    task.state = "Failed";
    task.failCount += 1;
    task.lastFailedAt = timestamp;
    task.reason = `parallel track exited with code ${result.exitCode}`;
  }

  state.updatedAt = timestamp;
}

function formatSummary(plan, results) {
  return {
    generatedAt: nowIso(),
    primaryTaskId: plan.primaryTaskId,
    primaryAction: plan.primaryAction,
    syncPoints: plan.syncPoints,
    results,
    failedTracks: results.filter((item) => !item.success).map((item) => item.taskId)
  };
}

async function spawnTracks(parsed) {
  const planFile = path.resolve(requireOption(parsed.options, "plan-file"));
  const plan = readPlan(planFile);

  if (plan.parallelTracks.length === 0) {
    const emptySummary = formatSummary(plan, []);
    if (parsed.flags.has("json")) {
      console.log(JSON.stringify(emptySummary, null, 2));
    } else {
      console.log("No parallel tracks in plan.");
    }
    return 0;
  }

  const agentTemplate = parsed.options["agent-cmd"] ?? "";
  const rawMaxWorkers = parsed.options["max-workers"] ?? String(DEFAULT_MAX_WORKERS);
  const maxWorkers = Number.parseInt(String(rawMaxWorkers), 10);
  if (!Number.isFinite(maxWorkers) || maxWorkers <= 0) {
    throw new Error("Invalid --max-workers value. Expected a positive integer.");
  }

  const logDir = path.resolve(parsed.options["log-dir"] ?? DEFAULT_LOG_DIR);
  const tracks = plan.parallelTracks.map((track) => ({
    ...track,
    command: buildTrackCommand(track, agentTemplate)
  }));

  let results;
  if (parsed.flags.has("dry-run")) {
    results = tracks.map((track) => ({
      taskId: track.taskId,
      command: track.command,
      success: true,
      exitCode: 0,
      signal: "",
      durationMs: 0,
      logFile: path.join(logDir, `${track.taskId}.log`),
      dryRun: true
    }));
  } else {
    results = await runWithWorkerPool(tracks, maxWorkers, async (track) => {
      const logFile = path.join(logDir, `${track.taskId}.log`);
      return runTrack(track, track.command, logFile);
    });
  }

  const shouldUpdateState = !parsed.flags.has("skip-state-update");
  const stateFile = path.resolve(parsed.options["state-file"] ?? DEFAULTS.stateFile);
  const boardFile = path.resolve(parsed.options["board-file"] ?? DEFAULTS.boardFile);
  const journalFile = path.resolve(parsed.options["journal-file"] ?? DEFAULTS.journalFile);

  if (shouldUpdateState && !parsed.flags.has("dry-run")) {
    const state = readState(stateFile);
    const resultMap = new Map(results.map((result) => [result.taskId, result]));
    applyStateTransitions(state, tracks, resultMap);
    writeJsonFile(stateFile, state);
    await renderBoard(stateFile, boardFile);
  }

  if (!parsed.flags.has("dry-run")) {
    appendJournalEntry(journalFile, {
      primaryTaskId: plan.primaryTaskId,
      syncPoints: plan.syncPoints,
      results
    });
  }

  const summary = formatSummary(plan, results);
  if (parsed.flags.has("json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Primary: ${summary.primaryTaskId || "-"}`);
    console.log(
      `Tracks : ${summary.results.length === 0 ? "-" : summary.results.map((item) => item.taskId).join(", ")}`
    );
    for (const result of summary.results) {
      const marker = result.success ? "PASS" : "FAIL";
      console.log(
        `- ${result.taskId}: ${marker} (exit=${result.exitCode}, ${Math.round(result.durationMs / 1000)}s)`
      );
    }
    console.log(
      `Sync   : ${summary.syncPoints.length === 0 ? "-" : summary.syncPoints.join(", ")}`
    );
  }

  return summary.failedTracks.length > 0 ? 1 : 0;
}

async function main() {
  const parsed = parseArgv(process.argv.slice(2));
  if (!parsed.command || parsed.flags.has("help") || parsed.command === "help") {
    printHelp();
    return 0;
  }

  if (parsed.command !== "spawn") {
    throw new Error(`Unknown command: ${parsed.command}`);
  }

  return spawnTracks(parsed);
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
