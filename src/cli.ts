#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import {
  cmdAbort,
  cmdAdd,
  cmdDone,
  cmdHello,
  cmdInit,
  cmdList,
  cmdLoop,
  cmdNext,
  cmdPlan,
  cmdReview,
  cmdRun,
  cmdStart,
  cmdStatus,
  cmdStep,
  cmdTest,
  cmdWorld,
} from "./lib/core/commands.js";
import { cmdCancel } from "./lib/core/cancel.js";
import { cmdWatch } from "./lib/core/watch.js";
import {
  cmdOpencodeAdd,
  cmdOpencodeList,
  cmdOpencodeServe,
  cmdOpencodeStatus,
} from "./lib/opencode/commands.js";

function resolveVersion(): string {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = join(currentDir, "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      version?: string;
    };

    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function resolveBuildCommitId(): string | undefined {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const buildMetaPath = join(currentDir, "build-meta.json");
    const buildMeta = JSON.parse(readFileSync(buildMetaPath, "utf-8")) as {
      commit?: string | null;
    };

    return buildMeta.commit ?? undefined;
  } catch {
    return undefined;
  }
}

const commit = resolveBuildCommitId();
const version = resolveVersion();
const versionString = commit ? `${version} (${commit})` : `${version}`;

async function main(): Promise<void> {
  const cli = cac("techlead");

  // Use cac's built-in version handling
  cli.version(versionString);

  cli.command("hello", "Print a hello message").action(cmdHello);
  cli.command("world", "Ask Claude to say hello to the world").action(() => cmdWorld());
  cli.command("init", "Initialize TechLead").action(cmdInit);
  cli.command("add <title>", "Add a new task").action(cmdAdd);
  cli.command("list", "List all tasks").action(cmdList);
  cli.command("status", "Show current status").action(cmdStatus);
  cli
    .command("plan [taskId]", "Run plan phase for backlog task")
    .action((taskId) => cmdPlan(taskId));
  cli
    .command("start [taskId]", "Move planned task to exec phase")
    .action((taskId) => cmdStart(taskId));
  cli
    .command("step [taskId]", "Execute one step in exec phase")
    .action((taskId) => cmdStep(taskId));
  cli
    .command("review [taskId]", "Run adversarial review phase")
    .action((taskId) => cmdReview(taskId));
  cli.command("test [taskId]", "Run adversarial test phase").action((taskId) => cmdTest(taskId));
  cli.command("done [taskId]", "Mark tested task as done").action(cmdDone);
  cli.command("next", "Switch to next task in queue").action(cmdNext);
  cli
    .command("run", "Auto-run current/next task by composing phase commands")
    .action(() => cmdRun());
  cli
    .command("loop", "Continuously run tasks until stop conditions are reached")
    .option("--max-cycles <n>", "Maximum number of loop cycles", { default: 20 })
    .option("--max-no-progress <n>", "Stop after N consecutive no-progress cycles", { default: 3 })
    .action((options) => cmdLoop(options));
  cli.command("abort", "Abort current task").action(cmdAbort);

  cli
    .command("watch", "Watch active agent runs")
    .option("--follow", "Continuously watch for changes")
    .option("--run <runId>", "Show specific run details")
    .action((options) => cmdWatch(options));

  cli.command("cancel [runId]", "Cancel an active agent run").action((runId) => cmdCancel(runId));

  cli
    .command(
      "opencode <subcommand> [...args]",
      "OpenCode commands (add <title>|list|status|serve <action>)"
    )
    .action(async (subcommand, args) => {
      switch (subcommand) {
        case "add": {
          const title = args?.join(" ");
          if (!title) {
            console.error("❌ Error: Task title required");
            console.log("   Usage: techlead opencode add <title>");
            process.exit(1);
          }
          await cmdOpencodeAdd(title);
          break;
        }
        case "list":
          cmdOpencodeList();
          break;
        case "status":
          await cmdOpencodeStatus();
          break;
        case "serve": {
          const action = args?.[0];
          if (!action || !["start", "stop", "status"].includes(action)) {
            console.error("❌ Error: serve action must be start, stop, or status");
            console.log("   Usage: techlead opencode serve [start|stop|status]");
            process.exit(1);
          }
          await cmdOpencodeServe(action as "start" | "stop" | "status");
          break;
        }
        default: {
          if (!subcommand) {
            console.log("📖 OpenCode Commands:");
            console.log("   add <title>   - Add OpenCode-managed task");
            console.log("   list          - List OpenCode tasks");
            console.log("   status        - Show OpenCode server status");
            console.log("   serve <action>- Manage OpenCode server (start|stop|status)");
          } else {
            console.error(`❌ Unknown subcommand: ${subcommand}`);
            console.log("   Run: techlead opencode --help");
            process.exit(1);
          }
        }
      }
    });

  cli.help();
  cli.parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
