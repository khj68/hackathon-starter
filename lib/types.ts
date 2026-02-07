/**
 * Claude Code Session Types (v2.1.1)
 *
 * Simplified subset of types for rendering Claude Code session messages.
 * Full types are auto-generated from the JSON Schema definitions at:
 *   https://github.com/moru-ai/agent-schemas/claude-code/v2.1.1/session.schema.json
 *
 * Complete TypeScript types live in the maru monorepo:
 *   ~/moru/maru/packages/types/src/claude-code/session.ts
 *
 * This file contains only the types needed for the hackathon starter's
 * message rendering components. The full schema supports additional
 * message types (SummaryMessage, FileHistorySnapshot, QueueOperation)
 * and richer metadata (version, cwd, gitBranch, todos, etc.).
 */

// ============================================================================
// Content Blocks
// ============================================================================

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
  signature: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ImageSource {
  type: "base64";
  media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  data: string;
}

export interface ImageBlock {
  type: "image";
  source: ImageSource;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: "text"; text: string } | { type: "image"; source: ImageSource }>;
  is_error?: boolean;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock;

// ============================================================================
// Messages
// ============================================================================

export interface UserMessagePayload {
  role: "user";
  content: string | ContentBlock[];
}

export interface UserMessage {
  type: "user";
  uuid: string;
  parentUuid: string | null;
  sessionId: string;
  timestamp: string;
  isSidechain: boolean;
  message: UserMessagePayload;
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
}

export interface AssistantMessagePayload {
  model: string;
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | null;
  stop_sequence: string | null;
  usage: UsageInfo;
}

export interface AssistantMessage {
  type: "assistant";
  uuid: string;
  parentUuid: string | null;
  sessionId: string;
  timestamp: string;
  isSidechain: boolean;
  message: AssistantMessagePayload;
  isApiErrorMessage?: boolean;
  error?: string;
}

export type SystemMessageSubtype =
  | "local_command"
  | "turn_duration"
  | "api_error"
  | "stop_hook_summary"
  | "compact_boundary";

export interface CompactMetadata {
  trigger?: string;
  preTokens?: number;
}

export interface SystemMessage {
  type: "system";
  uuid: string;
  parentUuid: string | null;
  sessionId: string;
  timestamp: string;
  isSidechain: boolean;
  subtype: SystemMessageSubtype;
  content?: string;
  durationMs?: number;
  compactMetadata?: CompactMetadata;
}

export type SessionEntry = UserMessage | AssistantMessage | SystemMessage;

// ============================================================================
// Type Guards
// ============================================================================

export function isUserMessage(entry: SessionEntry): entry is UserMessage {
  return entry.type === "user";
}

export function isAssistantMessage(entry: SessionEntry): entry is AssistantMessage {
  return entry.type === "assistant";
}

export function isSystemMessage(entry: SessionEntry): entry is SystemMessage {
  return entry.type === "system";
}

export function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === "text";
}

export function isThinkingBlock(block: ContentBlock): block is ThinkingBlock {
  return block.type === "thinking";
}

export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use";
}

export function isToolResultBlock(block: ContentBlock): block is ToolResultBlock {
  return block.type === "tool_result";
}

export function isImageBlock(block: ContentBlock): block is ImageBlock {
  return block.type === "image";
}

// ============================================================================
// API Types
// ============================================================================

export interface ConversationResponse {
  id: string;
  status: "idle" | "running" | "completed" | "error";
  messages: SessionEntry[];
  errorMessage?: string;
}

export interface SendMessageRequest {
  conversationId: string | null;
  content: string;
}

export interface SendMessageResponse {
  conversationId: string;
  status: "running";
}

export interface FileInfo {
  name: string;
  type: "file" | "directory";
  size?: number;
  path: string;
  children?: FileInfo[];
}

// Alias for compatibility with maru components
export type FileNode = FileInfo & { type: "file" | "folder" };

export interface StatusCallbackRequest {
  status: "completed" | "error";
  errorMessage?: string;
  sessionId?: string;
}

export type PlannerStage =
  | "collect_intent"
  | "collect_dates"
  | "collect_region"
  | "collect_weights"
  | "search"
  | "recommend";

export interface PlannerQuestionOption {
  label: string;
  value: string;
  reason?: string;
}

export interface PlannerQuestion {
  id: string;
  text: string;
  options: PlannerQuestionOption[];
  allowFreeText: boolean;
}

export interface PlannerFlightResult {
  id: string;
  summary: string;
  price: { amount: number; currency: string };
  provider: string;
  score: number;
  url: string;
  badges: string[];
}

export interface PlannerStayResult {
  id: string;
  name: string;
  rating: number;
  pricePerNight: { amount: number; currency: string };
  location: { area: string; lat: number; lng: number };
  provider: string;
  score: number;
  url: string;
  badges: string[];
}

export interface PlannerRouteDraftDay {
  day: number;
  title: string;
  items: Array<{ time: string; name: string; type: string; url?: string }>;
}

export interface PlannerAgentResponse {
  type: "agent_response";
  stage: PlannerStage;
  questions: PlannerQuestion[];
  state: {
    trip?: {
      region?: { country?: string; city?: string; freeText?: string };
      stay?: { decided?: boolean; area?: string; notes?: string };
      purposeTags?: string[];
    };
    weights?: Record<string, number>;
    weightRationale?: Array<{ key: string; reason: string }>;
    dialog?: {
      reasoningLog?: string[];
      assumptions?: string[];
      lastAskedQuestionIds?: string[];
      questionAttempts?: Record<string, number>;
      routeProposalAsked?: boolean;
      routeAccepted?: "unknown" | "yes" | "no";
      stayQuestionAsked?: boolean;
      offerDiverseOptions?: boolean;
    };
  };
  results: {
    flights: PlannerFlightResult[];
    stays: PlannerStayResult[];
    routeDraft: PlannerRouteDraftDay[];
  };
  ui: {
    cards: Array<{
      type: "flight" | "stay" | "place";
      refId: string;
      ctaLabel: string;
    }>;
  };
}

export function isPlannerAgentResponse(value: unknown): value is PlannerAgentResponse {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (obj.type !== "agent_response") return false;
  if (!obj.results || typeof obj.results !== "object") return false;
  if (!obj.ui || typeof obj.ui !== "object") return false;

  const results = obj.results as Record<string, unknown>;
  const ui = obj.ui as Record<string, unknown>;

  return (
    Array.isArray(results.flights) &&
    Array.isArray(results.stays) &&
    Array.isArray(results.routeDraft) &&
    Array.isArray(ui.cards)
  );
}
