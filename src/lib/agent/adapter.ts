/**
 * Agent Adapter - Unified interface for Claude Code, Codex CLI, and Kimi CLI
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SpawnArgs } from "./runtime-types.js";

export type AgentProvider = "kimi" | "claude" | "codex";

interface CodexOutputData {
  type: "result" | "message";
  content?: string;
  message?: string;
  session_id?: string;
  error?: string;
}

export interface AgentConfig {
  provider: AgentProvider;
  model?: string;
  maxBudgetUsd?: number;
  allowedTools?: string[];
  workingDir?: string;
  /**
   * Task ID for organizing logs
   * Logs will be stored in .techlead/tasks/{taskId}/logs/
   */
  taskId?: string;
}

export interface AgentResult {
  success: boolean;
  content: string;
  sessionId?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

export interface AgentOptions {
  systemPrompt?: string;
  systemPromptFile?: string;
  outputFormat?: "text" | "json";
  jsonSchema?: object;
  timeoutMs?: number;
  env?: Record<string, string>;
  /**
   * Enable execution logging
   * @default false
   */
  enableLogging?: boolean;
  /**
   * Custom task ID for logging
   * If not provided, a new one will be generated
   */
  taskId?: string;
  /**
   * Session ID for grouping related tasks
   */
  sessionId?: string;
  /**
   * Directory for log files
   * @default "logs/agent-executions"
   */
  logDir?: string;
}

/**
 * Check if agent CLI is available
 */
export function isAgentAvailable(provider: AgentProvider): boolean {
  try {
    execSync(`which ${provider}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Load system prompt from file or use provided string
 */
function loadSystemPrompt(options: AgentOptions): string | undefined {
  if (options.systemPromptFile && existsSync(options.systemPromptFile)) {
    return readFileSync(options.systemPromptFile, "utf8");
  }
  return options.systemPrompt;
}

/**
 * Build Claude Code CLI command
 */
export function buildClaudeCommand(
  prompt: string,
  config: AgentConfig,
  options: AgentOptions
): string {
  const args: string[] = ["-p"]; // Non-interactive mode

  // Output format
  if (options.outputFormat === "json") {
    args.push("--output-format=json");
  }

  // Model
  if (config.model) {
    args.push(`--model=${config.model}`);
  }

  // Budget limit
  if (config.maxBudgetUsd) {
    args.push(`--max-budget-usd=${config.maxBudgetUsd}`);
  }

  // Allowed tools
  if (config.allowedTools?.length) {
    args.push(`--allowed-tools=${config.allowedTools.join(",")}`);
  }

  // System prompt - merge into user prompt to avoid escaping issues
  const systemPrompt = loadSystemPrompt(options);
  let finalPrompt = prompt;
  if (systemPrompt) {
    finalPrompt = `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${prompt}`;
  }

  // JSON Schema for structured output
  if (options.jsonSchema) {
    const schemaStr = JSON.stringify(options.jsonSchema).replace(/"/g, '\\"');
    args.push(`--json-schema="${schemaStr}"`);
  }

  // Working directory
  if (config.workingDir) {
    args.push(`--add-dir=${resolve(config.workingDir)}`);
  }

  // Disable session persistence for non-interactive
  args.push("--no-session-persistence");

  // Skip permissions for fully automated execution
  args.push("--dangerously-skip-permissions");

  // Add the prompt (no escaping needed, execSync handles it)
  args.push(finalPrompt);

  return `claude ${args.join(" ")}`;
}

/**
 * Build Codex CLI command - simplified without shell escaping
 */
export function buildCodexCommand(
  prompt: string,
  config: AgentConfig,
  options: AgentOptions
): { cmd: string; args: string[] } {
  const args: string[] = ["exec"];

  // Output format
  if (options.outputFormat === "json") {
    args.push("--json");
  }

  // Model
  if (config.model) {
    args.push(`-m=${config.model}`);
  }

  // Full auto mode with bypass approvals for non-interactive execution
  // --dangerously-bypass-approvals-and-sandbox is required for fully automated CI runs
  args.push("--dangerously-bypass-approvals-and-sandbox");

  // Working directory
  if (config.workingDir) {
    args.push(`-C=${resolve(config.workingDir)}`);
  }

  // System prompt via config
  const systemPrompt = loadSystemPrompt(options);
  if (systemPrompt) {
    args.push(`-c=system_prompt=${systemPrompt}`);
  }

  // Add the prompt as final arg
  args.push(prompt);

  return { cmd: "codex", args };
}

/**
 * Parse Claude Code JSON output
 */
export function parseClaudeOutput(output: string): AgentResult {
  try {
    const data = JSON.parse(output);
    return {
      success: data.subtype === "success" && !data.is_error,
      content: data.result || "",
      sessionId: data.session_id,
      costUsd: data.total_cost_usd,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  } catch (error) {
    return {
      success: false,
      content: output,
      error: `Failed to parse JSON: ${error}`,
    };
  }
}

/**
 * Parse Codex JSONL output
 */
export function parseCodexOutput(output: string): AgentResult {
  // Codex outputs JSONL, find the last result message
  const lines = output.trim().split("\n");
  let lastResult: CodexOutputData | null = null;

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      if (data.type === "result" || data.type === "message") {
        lastResult = data;
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  if (!lastResult) {
    return {
      success: output.length > 0,
      content: output,
    };
  }

  return {
    success: lastResult.type === "result" && !lastResult.error,
    content: lastResult.content || lastResult.message || output,
    sessionId: lastResult.session_id,
    error: lastResult.error,
  };
}

/**
 * Build Kimi CLI command
 * Kimi uses --print mode for non-interactive execution (auto-approves all actions)
 */
export function buildKimiCommand(
  prompt: string,
  config: AgentConfig,
  options: AgentOptions
): { cmd: string; args: string[] } {
  const args: string[] = [];

  // Print mode: non-interactive, auto-approves all actions (--yolo)
  args.push("--print");

  // Output format - JSON for structured parsing
  if (options.outputFormat === "json") {
    args.push("--output-format=stream-json");
  } else {
    args.push("--output-format=text");
  }

  // Model
  if (config.model) {
    args.push(`--model=${config.model}`);
  }

  // Working directory
  if (config.workingDir) {
    args.push(`--work-dir=${resolve(config.workingDir)}`);
  }

  // Additional directories
  if (config.workingDir) {
    args.push(`--add-dir=${resolve(config.workingDir)}`);
  }

  // System prompt via config - merge into user prompt
  const systemPrompt = loadSystemPrompt(options);
  let finalPrompt = prompt;
  if (systemPrompt) {
    finalPrompt = `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${prompt}`;
  }

  // Add the prompt
  args.push("-p", finalPrompt);

  return { cmd: "kimi", args };
}

/**
 * Parse Kimi output
 * Kimi's --print mode outputs a structured text format (TurnBegin, StepBegin, ThinkPart, etc.)
 * We extract the relevant information from this format
 */
export function parseKimiOutput(output: string): AgentResult {
  // Check if output contains success indicators
  const hasToolCalls = output.includes("ToolCall(") || output.includes('"type":"function"');
  const hasTurnEnd = output.includes("TurnEnd()") || output.includes('"type":"turn.end"');
  const hasTextPart = output.includes("TextPart(") || output.includes('"type":"text"');

  // Extract text content from TextPart sections
  const textParts: string[] = [];
  const textRegex = /TextPart\(\s*type='text',\s*text='([^']+)'/g;
  let match: RegExpExecArray | null;
  match = textRegex.exec(output);
  while (match !== null) {
    textParts.push(match[1]);
    match = textRegex.exec(output);
  }

  // Also try to find text in the new format
  const newTextRegex = /text='([^']+)'[^}]*\n\s*\)/g;
  match = newTextRegex.exec(output);
  while (match !== null) {
    if (!textParts.includes(match[1])) {
      textParts.push(match[1]);
    }
    match = newTextRegex.exec(output);
  }

  const content = textParts.join("\n\n") || output;

  // Success if we have tool calls and turn completed
  const success = output.length > 0 && (hasTurnEnd || hasToolCalls || hasTextPart);

  return {
    success,
    content,
  };
}

/**
 * Auto-detect available agent
 * Kimi is preferred for fully automated execution (--print mode with auto-approval)
 * Falls back to Codex, then Claude
 */
export function detectAgent(): AgentProvider | null {
  if (isAgentAvailable("kimi")) return "kimi";
  if (isAgentAvailable("codex")) return "codex";
  if (isAgentAvailable("claude")) return "claude";
  return null;
}

/**
 * Create default config for detected agent
 */
export function createDefaultConfig(workingDir?: string): AgentConfig | null {
  const provider = detectAgent();
  if (!provider) return null;

  // Default models for each provider
  const defaultModels: Record<AgentProvider, string | undefined> = {
    kimi: undefined, // Kimi uses default model from config
    claude: "sonnet",
    codex: "gpt-4o",
  };

  return {
    provider,
    model: defaultModels[provider],
    maxBudgetUsd: 1.0,
    allowedTools: ["Read", "Edit", "Bash", "Glob"],
    workingDir,
  };
}

/**
 * Build unified SpawnArgs for any provider
 */
export function buildSpawnArgs(
  prompt: string,
  config: AgentConfig,
  options: AgentOptions
): SpawnArgs {
  if (config.provider === "kimi") {
    const { cmd, args } = buildKimiCommand(prompt, config, options);
    return { cmd, args };
  }

  if (config.provider === "codex") {
    const { cmd, args } = buildCodexCommand(prompt, config, options);
    return { cmd, args };
  }

  // Claude: build args array directly, use stdin for prompt
  const args: string[] = ["-p"];

  if (options.outputFormat === "json") {
    args.push("--output-format=json");
  }

  if (config.model) {
    args.push(`--model=${config.model}`);
  }

  if (config.maxBudgetUsd) {
    args.push(`--max-budget-usd=${config.maxBudgetUsd}`);
  }

  if (config.allowedTools?.length) {
    args.push(`--allowed-tools=${config.allowedTools.join(",")}`);
  }

  if (config.workingDir) {
    args.push(`--add-dir=${resolve(config.workingDir)}`);
  }

  args.push("--no-session-persistence");
  args.push("--dangerously-skip-permissions");

  // Merge system prompt into input (stdin), not as a CLI arg
  const systemPrompt = loadSystemPrompt(options);
  const input = systemPrompt
    ? `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${prompt}`
    : prompt;

  return { cmd: "claude", args, input };
}
