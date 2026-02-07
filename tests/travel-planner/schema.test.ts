import assert from "node:assert/strict";
import test from "node:test";

import { AgentResponseSchema, INITIAL_STATE } from "../../agent/src/travel-planner/schema.js";

test("agent response schema validates required structure", () => {
  const response = {
    type: "agent_response",
    stage: "collect_intent",
    questions: [
      {
        id: "q_budget_style",
        text: "가격 vs 퀄리티 중 어디가 더 중요해?",
        options: [
          { label: "최저가", value: "budget" },
          { label: "균형", value: "balanced" },
        ],
        allowFreeText: true,
      },
    ],
    state: JSON.parse(JSON.stringify(INITIAL_STATE)),
    results: {
      flights: [],
      stays: [],
      routeDraft: [],
    },
    ui: {
      cards: [],
    },
  };

  const parsed = AgentResponseSchema.parse(response);
  assert.equal(parsed.type, "agent_response");
});

test("agent response schema rejects invalid payload", () => {
  const invalid = {
    stage: "recommend",
  };

  const result = AgentResponseSchema.safeParse(invalid);
  assert.equal(result.success, false);
});
