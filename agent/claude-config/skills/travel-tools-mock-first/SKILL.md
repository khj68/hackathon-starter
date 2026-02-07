---
name: travel-tools-mock-first
description: Use for travel data tool orchestration when external MCP/auth is unavailable: keep provider interfaces stable, prefer mock fallback, and preserve clickable booking/map links.
---

# Travel Tools Mock-First

Use this skill when MCP or external provider auth is unavailable but product flow must still work.

## Goals

- Preserve tool interface contracts for flights, stays, and route draft.
- Use deterministic mock data as fallback.
- Always provide valid external URLs that open real pages.

## Required Rules

- Keep interfaces in one place and avoid coupling engine logic to provider internals.
- Search preconditions:
  - Flights: region + dates + origin (or origin undecided policy)
  - Stays: region + dates + travelers
  - Route: destination + purpose/constraints signal
- Prefer graceful fallback over hard failures.

## Implementation Pointers

- Tool interfaces/providers: `agent/src/travel-planner/tools.ts`
- Orchestration and guard conditions: `agent/src/travel-planner/engine.ts`, `agent/src/travel-planner/stage.ts`
- Result scoring: `agent/src/travel-planner/scoring.ts`

## Validation Checklist

- Search stage returns candidates even in no-auth environment.
- Flight/stay/place links are clickable and open expected provider pages.
- Engine can switch providers without changing response schema.
