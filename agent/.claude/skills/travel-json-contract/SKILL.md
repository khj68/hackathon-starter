---
name: travel-json-contract
description: Use for enforcing frontend-safe travel agent output JSON only, with strict schema compatibility and no raw/internal reasoning exposure.
---

# Travel JSON Contract

Use this skill when the user asks to adjust what the frontend sees from the travel agent.

## Goals

- Return only `agent_response` JSON that frontend can render directly.
- Keep schema compatibility with runtime validation.
- Hide internal/raw/diagnostic details from user-facing UI.

## Required Output Rules

- Keep top-level shape: `type`, `stage`, `questions`, `state`, `results`, `ui`.
- Include actionable URLs on recommendation items.
- Do not expose internal logs, raw payload dumps, or reasoning traces in UI.
- Keep response parseable as JSON every turn.

## Implementation Pointers

- Runtime schema: `agent/src/travel-planner/schema.ts`
- Response generation: `agent/src/travel-planner/engine.ts`
- Front rendering: `components/chat/cc-agent-response.tsx`
- Type guards: `lib/types.ts`

## Validation Checklist

- Zod validation passes at runtime.
- UI renders without needing markdown fallback.
- No `Raw JSON`/reasoning/internal score labels if user requested hidden internals.
