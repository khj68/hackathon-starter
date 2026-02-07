import assert from "node:assert/strict";
import test from "node:test";

import { runPlannerEngine } from "../../agent/src/travel-planner/engine.js";
import { INITIAL_STATE } from "../../agent/src/travel-planner/schema.js";

function cloneInitialState() {
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}

test("ambiguous answers still advance stage with assumptions", async () => {
  let state = cloneInitialState();

  let output = await runPlannerEngine(state, "목적은 휴식이고 가격이 싼 게 중요해 일정은 여유롭게");
  state = output.state;
  assert.equal(output.response.stage, "collect_region");

  output = await runPlannerEngine(state, "여행지는 모르겠어");
  state = output.state;
  assert.equal(output.response.stage, "collect_dates");

  output = await runPlannerEngine(state, "일주일 안에 최대한 빨리 떠나고싶어 3박 4일 정도?");
  state = output.state;
  const questionIds = output.response.questions.map((question) => question.id);

  assert.notEqual(output.response.stage, "collect_dates");
  assert.ok(state.trip.dates.start.length > 0);
  assert.ok(state.trip.dates.end.length > 0);
  assert.ok(!questionIds.includes("q_date_range"));
});

test("does not repeat collect_intent for budget+rest free text", async () => {
  let state = cloneInitialState();

  let output = await runPlannerEngine(state, "안녕");
  state = output.state;
  assert.equal(output.response.stage, "collect_intent");

  output = await runPlannerEngine(
    state,
    "다 모르겠고 그냥 100만원 선에서 어디 후딱 다녀오고싶어. 쉬러가고싶어."
  );

  assert.notEqual(output.response.stage, "collect_intent");
  assert.ok((output.response.state.trip.purposeTags || []).length > 0);
});

test("recommend stage proposes route after flights/stays are prepared", async () => {
  let state = cloneInitialState();
  state.trip.purposeTags = ["relax"];
  state.trip.region.city = "Tokyo";
  state.trip.region.country = "Japan";
  state.trip.dates.start = "2026-03-10";
  state.trip.dates.end = "2026-03-13";
  state.trip.origin.airportCode = "ICN";
  state.trip.budgetStyle = "balanced";
  state.trip.pace = "relaxed";

  const output = await runPlannerEngine(state, "추천해줘");
  const questionIds = output.response.questions.map((question) => question.id);
  assert.equal(output.response.stage, "recommend");
  assert.ok(output.response.results.flights.length > 0);
  assert.ok(output.response.results.stays.length > 0);
  assert.ok(questionIds.includes("q_route_offer"));
});

test("route flow asks stay-location first then avoids repeating same question", async () => {
  let state = cloneInitialState();
  state.trip.purposeTags = ["relax"];
  state.trip.region.city = "Osaka";
  state.trip.region.country = "Japan";
  state.trip.dates.start = "2026-04-01";
  state.trip.dates.end = "2026-04-04";
  state.trip.origin.airportCode = "ICN";
  state.trip.budgetStyle = "budget";
  state.trip.pace = "balanced";

  let output = await runPlannerEngine(state, "추천해줘");
  state = output.state;
  assert.ok(output.response.questions.some((question) => question.id === "q_route_offer"));

  output = await runPlannerEngine(state, "여행 경로 추천해줘");
  state = output.state;
  assert.ok(output.response.questions.some((question) => question.id === "q_route_stay_area"));

  output = await runPlannerEngine(state, "모르겠어 그냥 추천해줘");
  const questionIds = output.response.questions.map((question) => question.id);
  assert.ok(!questionIds.includes("q_route_stay_area"));
  assert.ok(output.response.results.routeDraft.length > 0);
});
