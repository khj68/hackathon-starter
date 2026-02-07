#!/usr/bin/env node
/**
 * Travel Planner Agent runtime.
 *
 * Protocol:
 * 1. Receive process_start and session_message from stdin
 * 2. Update planner state machine + run tool orchestration
 * 3. Append user/assistant entries to Claude-compatible JSONL session
 * 4. Assistant output content is strictly JSON (agent_response schema)
 * 5. Call callback endpoint with completed/error status
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { execSync } from "node:child_process";

import { AgentResponseSchema } from "./travel-planner/schema.js";
import { runPlannerEngine } from "./travel-planner/engine.js";
import { loadPlannerState, savePlannerState } from "./travel-planner/state.js";

interface ProcessStartCommand {
  type: "process_start";
  session_id?: string;
}

interface SessionMessageCommand {
  type: "session_message";
  text?: string;
  content?: Array<{ type: string; text?: string }>;
}

interface AgentMessage {
  type: string;
  session_id?: string;
  message?: string;
  result?: {
    duration_ms?: number;
    duration_api_ms?: number;
    total_cost_usd?: number | null;
    num_turns?: number;
  };
}

interface SessionEntry {
  type: "user" | "assistant" | "system";
  uuid: string;
  parentUuid: string | null;
  sessionId: string;
  timestamp: string;
  isSidechain: boolean;
  message?: unknown;
  subtype?: string;
  content?: string;
}

function emit(msg: AgentMessage): void {
  console.log(JSON.stringify(msg));
}

function parseContent(msg: SessionMessageCommand): string {
  if (msg.text) return msg.text;
  if (msg.content) {
    return msg.content
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text!)
      .join("\n");
  }
  return "";
}

class LineReader {
  private lines: string[] = [];
  private resolvers: ((line: string | null) => void)[] = [];
  private closed = false;

  constructor(rl: readline.Interface) {
    rl.on("line", (line) => {
      if (this.resolvers.length > 0) {
        const resolve = this.resolvers.shift()!;
        resolve(line);
      } else {
        this.lines.push(line);
      }
    });

    rl.on("close", () => {
      this.closed = true;
      while (this.resolvers.length > 0) {
        const resolve = this.resolvers.shift()!;
        resolve(null);
      }
    });
  }

  async readLine(): Promise<string | null> {
    if (this.lines.length > 0) {
      return this.lines.shift()!;
    }

    if (this.closed) {
      return null;
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }
}

function flushVolume(): void {
  try {
    execSync("sync", { timeout: 10_000 });
  } catch {
    // Non-fatal: callback still proceeds
  }
}

async function callCallback(status: "completed" | "error", sessionId: string, errorMessage?: string): Promise<void> {
  const callbackUrl = process.env.CALLBACK_URL;
  if (!callbackUrl) {
    console.error("[AGENT] CALLBACK_URL missing; skipping callback");
    return;
  }

  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        sessionId,
        errorMessage,
      }),
    });

    if (!response.ok) {
      console.error(`[AGENT] callback failed: ${response.status}`);
    }
  } catch (error) {
    console.error("[AGENT] callback error", error);
  }
}

function getSessionFilePath(workspace: string, sessionId: string): string {
  return path.join(workspace, ".claude", "projects", "-workspace-data", `${sessionId}.jsonl`);
}

function readLastEntry(sessionFilePath: string): SessionEntry | null {
  if (!fs.existsSync(sessionFilePath)) {
    return null;
  }

  const content = fs.readFileSync(sessionFilePath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]!) as SessionEntry;
      if (parsed.uuid) {
        return parsed;
      }
    } catch {
      // Continue searching previous line
    }
  }

  return null;
}

function appendSessionEntries(workspace: string, sessionId: string, userText: string, responseText: string): void {
  const sessionFilePath = getSessionFilePath(workspace, sessionId);
  fs.mkdirSync(path.dirname(sessionFilePath), { recursive: true });

  const lastEntry = readLastEntry(sessionFilePath);
  const userUuid = randomUUID();
  const assistantUuid = randomUUID();
  const now = new Date().toISOString();

  const userEntry: SessionEntry = {
    type: "user",
    uuid: userUuid,
    parentUuid: lastEntry?.uuid ?? null,
    sessionId,
    timestamp: now,
    isSidechain: false,
    message: {
      role: "user",
      content: userText,
    },
  };

  const assistantEntry: SessionEntry = {
    type: "assistant",
    uuid: assistantUuid,
    parentUuid: userUuid,
    sessionId,
    timestamp: new Date().toISOString(),
    isSidechain: false,
    message: {
      model: "travel-planner-agent-v1",
      id: `msg_${assistantUuid}`,
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: responseText }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
    },
  };

  fs.appendFileSync(sessionFilePath, `${JSON.stringify(userEntry)}\n${JSON.stringify(assistantEntry)}\n`, "utf-8");
}

async function main(): Promise<void> {
  const workspace = process.env.WORKSPACE_DIR || process.cwd();
  const envResumeSessionId = process.env.RESUME_SESSION_ID || undefined;

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });
  const reader = new LineReader(rl);

  let sessionId = envResumeSessionId || randomUUID();

  try {
    const startLine = await reader.readLine();
    if (!startLine) {
      emit({ type: "process_error", message: "No input received" });
      return;
    }

    const startMsg = JSON.parse(startLine) as ProcessStartCommand;
    if (startMsg.type !== "process_start") {
      emit({ type: "process_error", message: "Expected process_start" });
      return;
    }

    sessionId = startMsg.session_id || envResumeSessionId || sessionId;

    emit({
      type: "process_ready",
      session_id: sessionId,
    });

    emit({
      type: "session_started",
      session_id: sessionId,
    });

    const msgLine = await reader.readLine();
    if (!msgLine) {
      emit({ type: "process_error", message: "No session_message received" });
      return;
    }

    const sessionMsg = JSON.parse(msgLine) as SessionMessageCommand;
    if (sessionMsg.type !== "session_message") {
      emit({ type: "process_error", message: "Expected session_message" });
      return;
    }

    const prompt = parseContent(sessionMsg);
    if (!prompt.trim()) {
      emit({ type: "process_error", message: "Empty prompt" });
      return;
    }

    const startedAt = Date.now();
    const state = loadPlannerState(workspace);
    const { state: nextState, response } = await runPlannerEngine(state, prompt);
    savePlannerState(workspace, nextState);

    const validatedResponse = AgentResponseSchema.parse(response);
    const responseText = JSON.stringify(validatedResponse, null, 2);

    appendSessionEntries(workspace, sessionId, prompt, responseText);

    const durationMs = Date.now() - startedAt;
    emit({
      type: "session_complete",
      session_id: sessionId,
      result: {
        duration_ms: durationMs,
        duration_api_ms: 0,
        total_cost_usd: 0,
        num_turns: 1,
      },
    });

    flushVolume();
    await callCallback("completed", sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ type: "process_error", message });
    flushVolume();
    await callCallback("error", sessionId, message);
  } finally {
    rl.close();
    emit({ type: "process_stopped" });
  }
}

main().catch((error) => {
  console.error("[AGENT] fatal error", error);
  process.exit(1);
});
