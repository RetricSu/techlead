import { OpencodeClient, ServerUnavailableError } from "./client.js";
import type {
  OpencodeConfig,
  MessageWithParts,
  RunnerOptions,
  RunnerResult,
  Todo,
  TokenUsage,
} from "./types.js";
import { readTask, writeTask } from "../core/repo.js";
import type { Task } from "../core/types.js";

const DEFAULT_OPTIONS: RunnerOptions = {
  timeoutMs: 600000,
  pollIntervalMs: 5000,
  maxPollAttempts: 120,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTaskComplete(todos: Todo[]): boolean {
  if (todos.length === 0) {
    return true;
  }
  return !todos.some((todo) => todo.status === "pending" || todo.status === "in_progress");
}

export class OpencodeRunner {
  private client: OpencodeClient;
  private options: RunnerOptions;

  constructor(config: Partial<OpencodeConfig> = {}, options: Partial<RunnerOptions> = {}) {
    this.client = new OpencodeClient(config);
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async pollForCompletion(
    sessionId: string,
    intervalMs: number = this.options.pollIntervalMs,
    maxAttempts: number = this.options.maxPollAttempts
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.client.getSessionStatus(sessionId);

      if (isTaskComplete(status.todos)) {
        return true;
      }

      await sleep(intervalMs);
    }

    return false;
  }

  private async updateTaskStatus(
    taskId: string,
    status: Task["status"],
    phase: Task["phase"]
  ): Promise<void> {
    try {
      const task = readTask(taskId);
      task.status = status;
      task.phase = phase;

      if (status === "in_progress" && !task.started_at) {
        task.started_at = new Date().toISOString();
      }

      if (status === "done" || status === "failed") {
        task.completed_at = new Date().toISOString();
      }

      writeTask(taskId, task);
    } catch {
      console.warn(`Failed to update task ${taskId} status`);
    }
  }

  private async getSessionResult(
    _sessionId: string
  ): Promise<{ content: string; tokens?: TokenUsage }> {
    return { content: "" };
  }

  async runTask(
    taskId: string,
    prompt: string,
    overrideOptions?: Partial<RunnerOptions>
  ): Promise<RunnerResult> {
    const options = { ...this.options, ...overrideOptions };
    let sessionId: string | undefined;

    try {
      await this.updateTaskStatus(taskId, "in_progress", "exec");

      const isRunning = await this.client.isServerRunning();
      if (!isRunning) {
        throw new ServerUnavailableError();
      }

      const session = await this.client.createSession({
        title: `TechLead Task: ${taskId}`,
      });
      sessionId = session.id;

      await this.client.sendPrompt(sessionId, prompt, {
        agent: options.agent,
        model: options.model,
        tools: options.tools,
      });

      const completed = await this.pollForCompletion(
        sessionId,
        options.pollIntervalMs,
        options.maxPollAttempts
      );

      if (!completed) {
        throw new Error(`Task did not complete within ${options.maxPollAttempts} polling attempts`);
      }

      const finalStatus = await this.client.getSessionStatus(sessionId);

      if (finalStatus.status.type === "retry") {
        throw new Error(`Session in retry state: ${finalStatus.status.message}`);
      }

      await this.updateTaskStatus(taskId, "done", "completed");

      const result = await this.getSessionResult(sessionId);

      return {
        success: true,
        content: result.content,
        sessionId,
      };
    } catch (error) {
      await this.updateTaskStatus(taskId, "failed", "exec");

      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        content: "",
        error: errorMessage,
        sessionId,
      };
    }
  }

  async runTaskWithMessages(
    taskId: string,
    prompt: string,
    overrideOptions?: Partial<RunnerOptions>
  ): Promise<RunnerResult & { messages?: MessageWithParts[] }> {
    const result = await this.runTask(taskId, prompt, overrideOptions);
    return result;
  }
}

export default OpencodeRunner;
