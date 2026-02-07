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
export {};
