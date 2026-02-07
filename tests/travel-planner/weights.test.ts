import assert from "node:assert/strict";
import test from "node:test";

import { INITIAL_STATE } from "../../agent/src/travel-planner/schema.js";
import { applyPreferenceSignals, inferPreferenceSignalsFromText } from "../../agent/src/travel-planner/weights.js";

function cloneInitialState() {
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}

test("weights are updated from user preference signals", () => {
  const state = cloneInitialState();
  const signals = inferPreferenceSignalsFromText("최저가 위주로 보고 후기 좋은 곳, 직항이면 좋겠어");
  const updated = applyPreferenceSignals(state, signals);

  assert.ok(updated.weights.price > INITIAL_STATE.weights.price);
  assert.ok(updated.weights.review > INITIAL_STATE.weights.review);
  assert.ok(updated.weights.route > INITIAL_STATE.weights.route);
  assert.ok(updated.weightRationale.length >= 2);
  assert.ok(updated.weightRationale.some((item: { key: string }) => item.key === "price"));
});
