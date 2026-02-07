---
name: travel-state-machine
description: Use for multi-turn travel planning flow control: stage transitions, de-duplicated follow-up questions, ambiguity assumptions, and preference-weight updates.
---

# Travel State Machine

Use this skill when the user asks to improve conversation flow quality for the travel planner.

## Goals

- Keep stage progression stable: `collect_intent -> collect_region -> collect_dates -> collect_weights -> search -> recommend`.
- Avoid repeating the same question IDs unless new information is needed.
- When user intent is vague, apply minimal assumptions and continue.
- Persist and update preference weights with rationale.

## Required Rules

- Ask at most 1-3 focused questions per turn.
- Do not re-ask already answered fields.
- If user says they are undecided, fill fallback assumptions and move forward.
- Record all assumption reasons in state.

## Implementation Pointers

- Core engine: `agent/src/travel-planner/engine.ts`
- Stage helpers: `agent/src/travel-planner/stage.ts`
- Question generation: `agent/src/travel-planner/questions.ts`
- Weight update logic: `agent/src/travel-planner/weights.ts`

## Validation Checklist

- No immediate repeated question set across turns.
- Ambiguous free-text still advances stage when enough signal exists.
- Weight rationale list is appended when preference signals are detected.
