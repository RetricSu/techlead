/**
 * Config loader for TechLead
 * Supports loading config from multiple sources with priority
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  type AgentConfig,
  type AgentProvider,
  detectAgent,
  isAgentAvailable,
} from "../agent/adapter.js";

export interface TechLeadConfig {
  /**
   * Default agent provider
   * @default "claude"
   */
  provider?: "claude" | "codex";

  /**
   * Default model to use
   */
  model?: string;

  /**
   * Maximum budget in USD per execution
   * @default 1.0
   */
  maxBudgetUsd?: number;

  /**
   * Allowed tools for agent
   */
  allowedTools?: string[];

  /**
   * Working directory for agent
   */
  workingDir?: string;

  /**
   * Enable execution logging
   * @default false
   */
  enableLogging?: boolean;

  /**
   * Default log directory
   */
  logDir?: string;

  /**
   * Default timeout in milliseconds
   * @default 300000 (5 minutes)
   */
  timeoutMs?: number;

  /**
   * Custom environment variables for agent
   */
  env?: Record<string, string>;
}

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

// Default configuration
const defaultConfig: TechLeadConfig = {
  provider: "claude",
  maxBudgetUsd: 1.0,
  allowedTools: ["Read", "Edit", "Bash", "Glob"],
  enableLogging: false,
  timeoutMs: 300000,
};

const DEFAULT_TIMEOUT_MS = defaultConfig.timeoutMs ?? 300000;
const DEFAULT_MAX_BUDGET_USD = defaultConfig.maxBudgetUsd ?? 1.0;
const DEFAULT_ALLOWED_TOOLS = defaultConfig.allowedTools ?? ["Read", "Edit", "Bash", "Glob"];

/**
 * Possible config file names
 */
const CONFIG_FILES = [
  "techlead.config.js",
  "techlead.config.mjs",
  ".techleadrc.json",
  ".techleadrc",
];

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

/**
 * Load config from a specific file path
 */
async function loadConfigFile(configPath: string): Promise<Partial<TechLeadConfig> | null> {
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    // JSON config
    if (configPath.endsWith(".json") || configPath.endsWith(".techleadrc")) {
      const content = readFileSync(configPath, "utf8");
      return JSON.parse(content) as Partial<TechLeadConfig>;
    }

    // JS/ESM config
    if (configPath.endsWith(".js") || configPath.endsWith(".mjs")) {
      if (process.env.TECHLEAD_ALLOW_EXECUTABLE_CONFIG === "0") {
        console.warn(
          `Skipping executable config file '${configPath}' because TECHLEAD_ALLOW_EXECUTABLE_CONFIG=0`
        );
        return null;
      }

      console.warn(
        `Loading executable config file '${configPath}'. Only use trusted config files in this location.`
      );

      // Clear module cache for hot reload in development
      const modulePath = pathToFileURL(resolve(configPath)).href;
      const config = await import(modulePath);
      return config.default || config;
    }

    return null;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    return null;
  }
}

/**
 * Find config file in given directory
 */
function findConfigFile(dir: string): string | null {
  for (const fileName of CONFIG_FILES) {
    const configPath = join(dir, fileName);
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

function getRuntimeConfigPath(cwd: string): string | null {
  const projectRuntimeConfigPath = join(cwd, ".techlead", "config.yaml");
  if (existsSync(projectRuntimeConfigPath)) {
    return projectRuntimeConfigPath;
  }

  const homeRuntimeConfigPath = join(homedir(), ".techlead", "config.yaml");
  if (existsSync(homeRuntimeConfigPath)) {
    return homeRuntimeConfigPath;
  }

  return null;
}

function readRuntimeConfigFile(cwd: string): {
  configPath: string | null;
  config: RuntimeConfigFile | null;
  error?: string;
} {
  const configPath = getRuntimeConfigPath(cwd);
  if (!configPath || !existsSync(configPath)) {
    return { configPath: null, config: null };
  }

  try {
    const parsed = parseYaml(readFileSync(configPath, "utf8")) as unknown;
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

/**
 * Load configuration from all sources
 * Priority: CLI args > Project config > Home config > Defaults
 */
export async function loadConfig(
  cliArgs: Partial<TechLeadConfig> = {},
  cwd: string = process.cwd()
): Promise<TechLeadConfig> {
  const configs: Partial<TechLeadConfig>[] = [defaultConfig];

  // 1. Load from home directory (lowest priority)
  const homeConfigPath = findConfigFile(homedir());
  if (homeConfigPath) {
    const homeConfig = await loadConfigFile(homeConfigPath);
    if (homeConfig) {
      configs.push(homeConfig);
    }
  }

  // 2. Load from project directory
  const projectConfigPath = findConfigFile(cwd);
  if (projectConfigPath) {
    const projectConfig = await loadConfigFile(projectConfigPath);
    if (projectConfig) {
      configs.push(projectConfig);
    }
  }

  // 3. CLI arguments (highest priority)
  configs.push(cliArgs);

  // Merge all configs
  return deepMerge(...configs);
}

/**
 * Deep merge multiple config objects
 */
function deepMerge(...objects: Partial<TechLeadConfig>[]): TechLeadConfig {
  const result: Record<string, unknown> = {};

  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;

      // Handle nested objects (like env)
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof result[key] === "object" &&
        result[key] !== null
      ) {
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value;
      }
    }
  }

  return result as TechLeadConfig;
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

/**
 * Get the path of the loaded config file (for debugging)
 */
export function getConfigPath(cwd: string = process.cwd()): string | null {
  // Check project directory first
  const projectConfig = findConfigFile(cwd);
  if (projectConfig) {
    return projectConfig;
  }

  // Check .techlead/config.yaml in project directory
  const techleadConfigPath = join(cwd, ".techlead", "config.yaml");
  if (existsSync(techleadConfigPath)) {
    return techleadConfigPath;
  }

  // Then home directory
  const homeConfig = findConfigFile(homedir());
  if (homeConfig) {
    return homeConfig;
  }

  // Check .techlead/config.yaml in home directory
  const homeTechleadConfigPath = join(homedir(), ".techlead", "config.yaml");
  if (existsSync(homeTechleadConfigPath)) {
    return homeTechleadConfigPath;
  }

  return null;
}
