import { listActiveRuns, writeRunState } from "../agent/run-state.js";
import { getTechleadDir } from "./paths.js";

export function cancelRun(
  runId: string,
  techleadDir?: string
): { success: boolean; error?: string } {
  const dir = techleadDir ?? getTechleadDir();
  const active = listActiveRuns(dir);
  const run = active.find((r) => r.runId === runId);

  if (!run) {
    return { success: false, error: `Run ${runId} not found among active runs` };
  }

  if (run.pid) {
    try {
      process.kill(run.pid, "SIGTERM");
      setTimeout(() => {
        try {
          process.kill(run.pid!, "SIGKILL");
        } catch {
          /* already dead */
        }
      }, 15000);
    } catch {
      /* Process already dead */
    }
  }

  run.status = "cancelled";
  run.completedAt = new Date().toISOString();
  run.error = "Cancelled by user";
  writeRunState(run, dir);

  return { success: true };
}

export function cmdCancel(runId?: string): void {
  const techleadDir = getTechleadDir();
  const active = listActiveRuns(techleadDir);

  if (active.length === 0) {
    console.log("No active runs to cancel.");
    return;
  }

  const targetId = runId ?? (active.length === 1 ? active[0].runId : undefined);

  if (!targetId) {
    console.log("Multiple active runs. Specify a run ID:");
    for (const run of active) {
      console.log(`  ${run.runId}  (task: ${run.taskId}, phase: ${run.phase})`);
    }
    return;
  }

  const result = cancelRun(targetId, techleadDir);
  if (result.success) {
    console.log(`Cancelled run ${targetId}`);
  } else {
    console.error(`Failed to cancel: ${result.error}`);
  }
}
