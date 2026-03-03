import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  detectAgent,
  isAgentAvailable,
  type AgentConfig,
  type AgentProvider,
} from "./agent-adapter.js";

export type AgentProviderPreference = AgentProvider | "auto";

interface RuntimeConfigFile {
  agent?: {
    provider?: AgentProviderPreference;
    model?: string;
    max_budget_usd?: number;
    timeout_ms?: number;
    allowed_tools?: string[];
  };
}

export interface ResolvedRuntimeAgentConfig {
  configPath: string | null;
  providerPreference: AgentProviderPreference;
  primaryConfig: AgentConfig;
  fallbackProvider: AgentProvider | null;
  timeoutMs: number;
}

type ResolveRuntimeConfigResult =
  | { ok: true; value: ResolvedRuntimeAgentConfig }
  | { ok: false; error: string; configPath: string | null };

const DEFAULT_TIMEOUT_MS = 300000;
const DEFAULT_MAX_BUDGET_USD = 1.0;
const DEFAULT_ALLOWED_TOOLS = ["Read", "Edit", "Bash", "Glob"];

export function defaultModelForProvider(provider: AgentProvider): string {
  return provider === "claude" ? "sonnet" : "gpt-4o";
}

function alternateProvider(provider: AgentProvider): AgentProvider {
  return provider === "claude" ? "codex" : "claude";
}

function parseNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function parseString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const arr = value
    .map((item) => parseString(item))
    .filter((item): item is string => item !== null);
  return arr.length > 0 ? arr : null;
}

function parseProviderPreference(value: unknown): AgentProviderPreference | null {
  if (value === undefined || value === null) return "auto";
  if (value === "auto" || value === "claude" || value === "codex") return value;
  return null;
}

function getConfigPath(cwd: string): string {
  return path.join(cwd, ".techlead", "config.yaml");
}

function readRuntimeConfigFile(cwd: string): {
  configPath: string | null;
  config: RuntimeConfigFile | null;
  error?: string;
} {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    return { configPath: null, config: null };
  }

  try {
    const parsed = parseYaml(fs.readFileSync(configPath, "utf8")) as unknown;
    if (parsed === undefined || parsed === null) {
      return { configPath, config: {} };
    }
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        configPath,
        config: null,
        error: "Invalid .techlead/config.yaml: root must be a map",
      };
    }
    return { configPath, config: parsed as RuntimeConfigFile };
  } catch (error) {
    return {
      configPath,
      config: null,
      error: `Failed to parse .techlead/config.yaml: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function resolveRuntimeAgentConfig(cwd: string = process.cwd()): ResolveRuntimeConfigResult {
  const loaded = readRuntimeConfigFile(cwd);
  if (loaded.error) {
    return {
      ok: false,
      error: loaded.error,
      configPath: loaded.configPath,
    };
  }

  const agentConfig = loaded.config?.agent;
  const providerPreference = parseProviderPreference(agentConfig?.provider);
  if (!providerPreference) {
    return {
      ok: false,
      error: "Invalid agent.provider; expected one of: auto | claude | codex",
      configPath: loaded.configPath,
    };
  }

  let primaryProvider: AgentProvider | null;
  if (providerPreference === "auto") {
    primaryProvider = detectAgent();
  } else {
    primaryProvider = providerPreference;
  }

  if (!primaryProvider) {
    return {
      ok: false,
      error: "No available agent CLI found. Install Claude Code or Codex.",
      configPath: loaded.configPath,
    };
  }

  if (!isAgentAvailable(primaryProvider)) {
    return {
      ok: false,
      error: `Configured provider '${primaryProvider}' is not available in PATH.`,
      configPath: loaded.configPath,
    };
  }

  const maxBudgetUsd = parseNumber(agentConfig?.max_budget_usd) ?? DEFAULT_MAX_BUDGET_USD;
  const timeoutMs = parseNumber(agentConfig?.timeout_ms) ?? DEFAULT_TIMEOUT_MS;
  const model = parseString(agentConfig?.model) ?? defaultModelForProvider(primaryProvider);
  const allowedTools = parseStringArray(agentConfig?.allowed_tools) ?? DEFAULT_ALLOWED_TOOLS;
  const fallback = alternateProvider(primaryProvider);
  const fallbackProvider = isAgentAvailable(fallback) ? fallback : null;

  return {
    ok: true,
    value: {
      configPath: loaded.configPath,
      providerPreference,
      primaryConfig: {
        provider: primaryProvider,
        model,
        maxBudgetUsd,
        allowedTools,
        workingDir: cwd,
      },
      fallbackProvider,
      timeoutMs,
    },
  };
}
