/**
 * OpenCode HTTP Client
 *
 * HTTP client for interacting with OpenCode server API.
 * Based on OpenCode API spec: https://opencode.ai/docs/server/
 */

import { spawn } from "node:child_process";
import type {
  CreateSessionRequest,
  FullSessionStatus,
  HealthResponse,
  OpencodeConfig,
  SendMessageRequest,
  Session,
} from "./types.js";

/**
 * Maximum number of retry attempts for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Delays for exponential backoff in milliseconds (1s, 2s, 4s)
 */
const RETRY_DELAYS = [1000, 2000, 4000];

/**
 * Default server configuration
 */
const DEFAULT_CONFIG: OpencodeConfig = {
  baseUrl: "http://127.0.0.1",
  port: 4096,
  autoStart: true,
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build full URL from base URL, port, and path
 */
function buildUrl(baseUrl: string, port: number, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  return `${cleanBase}:${port}/${cleanPath}`;
}

/**
 * Error thrown when the OpenCode server is not available
 */
export class ServerUnavailableError extends Error {
  constructor(message = "OpenCode server is not available") {
    super(message);
    this.name = "ServerUnavailableError";
  }
}

/**
 * Error thrown when an API request fails
 */
export class ApiRequestError extends Error {
  statusCode?: number;
  responseBody?: string;

  constructor(message: string, statusCode?: number, responseBody?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * HTTP client for OpenCode server API
 */
export class OpencodeClient {
  private config: OpencodeConfig;
  private serverStarting: boolean;
  private serverProcess: ReturnType<typeof spawn> | null;

  /**
   * Create a new OpenCode client
   */
  constructor(config: Partial<OpencodeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.serverStarting = false;
    this.serverProcess = null;
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = buildUrl(this.config.baseUrl, this.config.port, path);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...((options.headers as Record<string, string>) || {}),
        };

        // Add authentication if configured
        if (this.config.username && this.config.password) {
          const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
            "base64"
          );
          headers.Authorization = `Basic ${auth}`;
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (!response.ok) {
          const body = await response.text();
          throw new ApiRequestError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            body
          );
        }

        // Handle empty responses (e.g., 204 No Content)
        if (response.status === 204) {
          return undefined as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on 4xx errors (client errors)
        if (error instanceof ApiRequestError && error.statusCode) {
          if (error.statusCode >= 400 && error.statusCode < 500) {
            throw error;
          }
        }

        // Wait before retry (except on last attempt)
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAYS[attempt]);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if the OpenCode server is running
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await this.request<HealthResponse>("/global/health", {
        method: "GET",
      });
      return response.healthy === true;
    } catch {
      return false;
    }
  }

  /**
   * Start the OpenCode server daemon
   */
  async startServer(): Promise<void> {
    if (this.serverStarting) {
      // Wait for server to finish starting
      while (this.serverStarting) {
        await sleep(100);
      }
      return;
    }

    if (await this.isServerRunning()) {
      return;
    }

    this.serverStarting = true;

    try {
      // Spawn opencode serve process
      this.serverProcess = spawn("opencode", ["serve"], {
        detached: true,
        stdio: "ignore",
      });

      this.serverProcess.unref();

      // Wait for server to be ready (with timeout)
      const maxWaitMs = 30000;
      const checkIntervalMs = 500;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        if (await this.isServerRunning()) {
          return;
        }
        await sleep(checkIntervalMs);
      }

      throw new ServerUnavailableError("Timeout waiting for OpenCode server to start");
    } finally {
      this.serverStarting = false;
    }
  }

  /**
   * Ensure server is running (auto-start if configured)
   */
  private async ensureServer(): Promise<void> {
    if (await this.isServerRunning()) {
      return;
    }

    if (this.config.autoStart) {
      await this.startServer();
    } else {
      throw new ServerUnavailableError();
    }
  }

  /**
   * Create a new session
   */
  async createSession(request: CreateSessionRequest = {}): Promise<Session> {
    await this.ensureServer();
    return this.request<Session>("/session", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Send a prompt to a session (fire-and-forget)
   */
  async sendPrompt(
    sessionId: string,
    prompt: string,
    options: Omit<SendMessageRequest, "parts"> = {}
  ): Promise<void> {
    await this.ensureServer();

    const request: SendMessageRequest = {
      ...options,
      parts: [
        {
          id: crypto.randomUUID(),
          sessionID: sessionId,
          messageID: crypto.randomUUID(),
          type: "text",
          text: prompt,
        },
      ],
    };

    await this.request<void>(`/session/${encodeURIComponent(sessionId)}/prompt_async`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Get session status with todos
   */
  async getSessionStatus(sessionId: string): Promise<FullSessionStatus> {
    await this.ensureServer();
    return this.request<FullSessionStatus>(`/session/${encodeURIComponent(sessionId)}/todo`, {
      method: "GET",
    });
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<Session> {
    await this.ensureServer();
    return this.request<Session>(`/session/${encodeURIComponent(sessionId)}`, {
      method: "GET",
    });
  }

  /**
   * Check server health and get version info
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/global/health", {
      method: "GET",
    });
  }

  /**
   * List all sessions and their statuses
   */
  async listSessions(): Promise<Record<string, { type: string }>> {
    await this.ensureServer();
    return this.request<Record<string, { type: string }>>("/sessions", {
      method: "GET",
    });
  }
}

export default OpencodeClient;
