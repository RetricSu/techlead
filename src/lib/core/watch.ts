import fs from "node:fs";
import type { RunState } from "../agent/runtime-types.js";
import { listActiveRuns } from "../agent/run-state.js";
import { getTechleadDir } from "./paths.js";

export function formatActiveRuns(runs: RunState[]): string {
  if (runs.length === 0) {
    return "No active runs.";
  }

  const lines: string[] = [];
  lines.push("Run ID          Task       Phase   Provider  Status   Last Output");
  lines.push("-".repeat(80));

  for (const run of runs) {
    const lastOutput =
      run.outputTail.length > 0 ? run.outputTail[run.outputTail.length - 1].substring(0, 40) : "-";
    lines.push(
      `${run.runId.padEnd(16)} ${run.taskId.padEnd(10)} ${run.phase.padEnd(7)} ${run.provider.padEnd(9)} ${run.status.padEnd(8)} ${lastOutput}`
    );
  }

  return lines.join("\n");
}

export function cmdWatch(options: { follow?: boolean; run?: string }): void {
  const techleadDir = getTechleadDir();

  if (options.run) {
    const runs = listActiveRuns(techleadDir);
    const run = runs.find((r) => r.runId === options.run);
    if (!run) {
      console.log(`Run ${options.run} not found among active runs.`);
      return;
    }
    console.log(JSON.stringify(run, null, 2));
    return;
  }

  const runs = listActiveRuns(techleadDir);
  console.log(formatActiveRuns(runs));

  if (options.follow) {
    console.log("\nWatching for changes... (Ctrl+C to stop)\n");
    const tasksDir = `${techleadDir}/tasks`;
    if (!fs.existsSync(tasksDir)) return;

    const interval = setInterval(() => {
      const current = listActiveRuns(techleadDir);
      process.stdout.write("\x1B[2J\x1B[H");
      console.log(formatActiveRuns(current));
    }, 2000);

    process.on("SIGINT", () => {
      clearInterval(interval);
      process.exit(0);
    });
  }
}
