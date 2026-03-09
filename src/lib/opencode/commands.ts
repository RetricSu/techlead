import fs from "node:fs";
import path from "node:path";
import { getTasksDir, getTaskDir, getTemplatesRoot } from "../core/paths.js";
import { listAllTasks, readCurrent, readTask, writeTask } from "../core/repo.js";
import type { Task } from "../core/types.js";
import { generateTaskId, sanitizeDirName } from "../core/utils.js";
import { OpencodeClient, ServerUnavailableError } from "./client.js";
import { OpencodeRunner } from "./runner.js";

const OPENCODE_MARKER = ".opencode";

function isOpencodeTask(taskId: string): boolean {
  try {
    const taskDir = getTaskDir(taskId);
    return fs.existsSync(path.join(taskDir, OPENCODE_MARKER));
  } catch {
    return false;
  }
}

export async function cmdOpencodeAdd(title: string): Promise<void> {
  if (!title?.trim()) {
    console.error("❌ Error: Task title required");
    process.exit(1);
  }

  const taskId = generateTaskId();
  const dirName = `${taskId}-${sanitizeDirName(title)}`;
  const taskDir = path.join(getTasksDir(), dirName);

  fs.mkdirSync(taskDir, { recursive: true });

  const task: Task = {
    id: taskId,
    title: title.trim(),
    status: "backlog",
    phase: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
  };
  writeTask(taskId, task);
  fs.writeFileSync(path.join(taskDir, OPENCODE_MARKER), "", "utf8");

  const templatesRoot = getTemplatesRoot();
  const taskTemplateDir = path.join(templatesRoot, "tasks");
  if (fs.existsSync(taskTemplateDir)) {
    const readmeTemplatePath = path.join(taskTemplateDir, "README.md");
    if (fs.existsSync(readmeTemplatePath)) {
      let readme = fs.readFileSync(readmeTemplatePath, "utf8");
      readme = readme
        .replace(/\{\{TASK_TITLE\}\}/g, task.title)
        .replace(/\{\{TASK_ID\}\}/g, task.id)
        .replace(/\{\{CREATED_AT\}\}/g, task.created_at)
        .replace(/\{\{TASK_DESCRIPTION\}\}/g, task.title);
      fs.writeFileSync(path.join(taskDir, "README.md"), readme, "utf8");
    }
  } else {
    fs.writeFileSync(
      path.join(taskDir, "README.md"),
      `# ${task.title}\n\n**ID**: ${task.id}\n**Status**: ${task.status}\n**Created**: ${task.created_at}\n\n## Description\n\n${task.title}\n\n## Acceptance Criteria\n\n- [ ] Criterion 1\n`,
      "utf8"
    );
  }

  console.log(`✅ OpenCode task created: ${taskId}`);
  console.log(`   ${task.title}`);
  console.log(`   🤖 Managed by OpenCode`);

  const client = new OpencodeClient();
  const isRunning = await client.isServerRunning();

  if (!isRunning) {
    console.log(`\n⚠️  OpenCode server not running`);
    console.log(`   Run: techlead opencode serve start`);
    console.log(`\n   Or manually start the OpenCode server`);
    return;
  }

  console.log(`\n🚀 Starting OpenCode execution...`);

  const runner = new OpencodeRunner();
  const prompt = `Implement the following task: ${task.title}\n\nTask ID: ${task.id}\n\nPlease work through this task systematically. Mark todos as complete when finished.`;

  const result = await runner.runTask(taskId, prompt);

  if (result.success) {
    console.log(`   ✅ Task completed via OpenCode`);
    if (result.sessionId) {
      console.log(`   📋 Session: ${result.sessionId}`);
    }
  } else {
    console.error(`   ❌ OpenCode execution failed`);
    if (result.error) {
      console.error(`   Error: ${result.error}`);
    }
    process.exit(1);
  }
}

export function cmdOpencodeList(): void {
  const tasks = listAllTasks();
  const opencodeTasks = tasks.filter((task) => isOpencodeTask(task.id));

  if (opencodeTasks.length === 0) {
    console.log('📭 No OpenCode-managed tasks. Run: techlead opencode add "task title"');
    return;
  }

  const current = readCurrent();

  console.log("\n🤖 OpenCode Tasks:\n");
  console.log("ID      Status         Phase     Title");
  console.log("-".repeat(60));

  for (const task of opencodeTasks) {
    const marker = current.task_id === task.id ? "▶ " : "  ";
    const status = task.status.padEnd(14);
    const phase = (task.phase || "-").padEnd(9);
    console.log(`${marker}${task.id}  ${status} ${phase} ${task.title}`);
  }
  console.log();
}

export async function cmdOpencodeStatus(): Promise<void> {
  const client = new OpencodeClient();

  try {
    const isRunning = await client.isServerRunning();

    if (!isRunning) {
      console.log("\n🔴 OpenCode Server: Not running");
      console.log("   Run: techlead opencode serve start");
      return;
    }

    const health = await client.checkHealth();
    console.log("\n🟢 OpenCode Server: Running");
    console.log(`   Version: ${health.version}`);

    const current = readCurrent();
    if (current.task_id && isOpencodeTask(current.task_id)) {
      const task = readTask(current.task_id);
      console.log("\n📍 Current OpenCode Task:");
      console.log(`   ${task.id}: ${task.title}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Phase:  ${task.phase || "-"}`);

      try {
        const sessions = await client.listSessions();
        const recentSessions = Object.entries(sessions)
          .filter(([, status]) => status.type !== "idle")
          .slice(0, 3);

        if (recentSessions.length > 0) {
          console.log("\n   Active Sessions:");
          for (const [sessionId, status] of recentSessions) {
            const statusIcon = status.type === "busy" ? "🔵" : "🟡";
            console.log(`   ${statusIcon} ${sessionId}: ${status.type}`);
          }
        }
      } catch {
        // Session listing is optional
      }
    } else if (current.task_id) {
      console.log("\n📍 Current task is not OpenCode-managed");
      console.log(`   Run: techlead status  # for regular task status`);
    } else {
      console.log("\n📍 No active OpenCode task");
      console.log('   Run: techlead opencode add "task title"');
    }
  } catch (error) {
    if (error instanceof ServerUnavailableError) {
      console.log("\n🔴 OpenCode Server: Not running");
      console.log("   Run: techlead opencode serve start");
    } else {
      console.error("\n❌ Failed to check OpenCode status");
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export async function cmdOpencodeServe(action: "start" | "stop" | "status"): Promise<void> {
  const client = new OpencodeClient();

  switch (action) {
    case "start": {
      const isRunning = await client.isServerRunning();

      if (isRunning) {
        console.log("🟢 OpenCode server is already running");
        return;
      }

      console.log("🚀 Starting OpenCode server...");
      console.log("   (This requires OpenCode CLI to be installed)");

      try {
        const { spawn } = await import("node:child_process");
        const child = spawn("opencode", ["serve"], {
          detached: true,
          stdio: "ignore",
        });

        child.unref();

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const started = await client.isServerRunning();
        if (started) {
          console.log("✅ OpenCode server started successfully");
          console.log("   Default URL: http://127.0.0.1:4096");
        } else {
          console.log("⏳ OpenCode server starting...");
          console.log("   Check status with: techlead opencode serve status");
        }
      } catch (error) {
        console.error("❌ Failed to start OpenCode server");
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        console.log("\n   Make sure OpenCode CLI is installed:");
        console.log("   npm install -g opencode");
      }
      break;
    }

    case "stop": {
      const isRunning = await client.isServerRunning();

      if (!isRunning) {
        console.log("🔴 OpenCode server is not running");
        return;
      }

      console.log("🛑 Stopping OpenCode server...");

      try {
        console.log("⚠️  OpenCode server stop not implemented via API");
        console.log("   Please stop the server manually:");
        console.log("   pkill -f 'opencode serve'");
      } catch (error) {
        console.error("❌ Failed to stop OpenCode server");
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      break;
    }

    case "status": {
      const isRunning = await client.isServerRunning();

      if (isRunning) {
        try {
          const health = await client.checkHealth();
          console.log("🟢 OpenCode Server: Running");
          console.log(`   Version: ${health.version}`);
          console.log(`   URL: http://127.0.0.1:4096`);
        } catch {
          console.log("🟡 OpenCode Server: Responding but health check failed");
        }
      } else {
        console.log("🔴 OpenCode Server: Not running");
        console.log("   Run: techlead opencode serve start");
      }
      break;
    }

    default: {
      console.error(`❌ Unknown action: ${action}`);
      console.log("   Usage: techlead opencode serve [start|stop|status]");
      process.exit(1);
    }
  }
}
