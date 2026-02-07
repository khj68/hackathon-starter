import assert from "node:assert/strict";
import test from "node:test";

import { INITIAL_STATE } from "../../agent/src/travel-planner/schema.js";
import { deriveStage } from "../../agent/src/travel-planner/stage.js";

function baseState() {
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}

test("stage starts from collect_intent", () => {
  const state = baseState();
  assert.equal(deriveStage(state), "collect_intent");
});

test("stage moves to collect_dates when intent and region exist", () => {
  const state = baseState();
  state.trip.purposeTags = ["relax"];
  state.trip.region.city = "Tokyo";
  state.trip.region.country = "Japan";
  assert.equal(deriveStage(state), "collect_dates");
});

test("stage becomes search when minimum requirements are filled", () => {
  const state = baseState();
  state.trip.purposeTags = ["food"];
  state.trip.region.city = "Tokyo";
  state.trip.region.country = "Japan";
  state.trip.dates.start = "2026-03-10";
  state.trip.dates.end = "2026-03-13";
  state.trip.origin.airportCode = "ICN";
  state.trip.budgetStyle = "balanced";
  assert.equal(deriveStage(state), "search");
});
