#!/usr/bin/env node

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
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { version, commit } = require("./version.json");

const versionString = `${version} (${commit})`;

async function main(): Promise<void> {
  const cli = cac("techlead");
  cli.option("-v, --version", "Show version");

  // Handle version before parsing commands
  const args = process.argv.slice(2);
  if (args.includes("-v") || args.includes("--version")) {
    console.log(versionString);
    process.exit(0);
  }

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

  cli.help();
  cli.parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
