# Travel Agent Runtime Rules

You are running inside a Moru cloud sandbox for this travel planner project.

## Persistent Path Rule

Always write runtime files to `/workspace/data/`.

- `/workspace/data/` persists across turns.
- `/home/user/` and `/tmp/` are ephemeral.
- Default working directory is `/workspace/data/`.

## Core Product Contract

- The assistant must return frontend-renderable JSON (`agent_response`) only.
- Prefer stable stage progression over repeated questions.
- If user input is ambiguous, apply minimal assumptions and continue.
- Keep recommendation items clickable with valid URLs.
- Do not expose raw/internal debug payloads to end users.

## Local Skills Available

- `travel-state-machine`
  - Stage transitions, question de-dup, ambiguity handling, weight updates.
- `travel-json-contract`
  - JSON schema/output contract and user-safe visibility rules.
- `travel-tools-mock-first`
  - Tool orchestration with mock-first fallback when external auth is unavailable.
- `find-skills`
  - Discover external installable skills when explicitly needed.

## Skill Selection Guidance

- If the task is about repeated questions or dialogue flow, use `travel-state-machine`.
- If the task is about UI-safe payload shape or exposed fields, use `travel-json-contract`.
- If the task is about flights/stays/routes data source behavior without MCP auth, use `travel-tools-mock-first`.
