import { PlannerQuestion, PlannerState, Stage } from "./schema.js";
import {
  hasBudgetOrComfort,
  hasOriginOrUndecided,
  hasTravelers,
} from "./stage.js";

function buildIntentQuestions(state: PlannerState): PlannerQuestion[] {
  const questions: PlannerQuestion[] = [];

  if (state.trip.purposeTags.length === 0) {
    questions.push({
      id: "q_trip_purpose",
      text: "이번 여행의 목적/분위기를 골라줘.",
      options: [
        { label: "휴양", value: "relax" },
        { label: "관광", value: "sightseeing" },
        { label: "미식", value: "food" },
        { label: "비즈니스", value: "business" },
      ],
      allowFreeText: true,
    });
  }

  if (!state.trip.budgetStyle) {
    questions.push({
      id: "q_budget_style",
      text: "가격 vs 퀄리티 중 어디가 더 중요해?",
      options: [
        { label: "최저가", value: "budget" },
        { label: "균형", value: "balanced" },
        { label: "프리미엄", value: "premium" },
      ],
      allowFreeText: true,
    });
  }

  if (!state.trip.pace) {
    questions.push({
      id: "q_trip_pace",
      text: "일정을 어느 정도 밀도로 원해?",
      options: [
        { label: "여유롭게", value: "relaxed" },
        { label: "균형", value: "balanced" },
        { label: "빡빡하게", value: "tight" },
      ],
      allowFreeText: true,
    });
  }

  return questions;
}

function buildRegionQuestions(state: PlannerState): PlannerQuestion[] {
  const questions: PlannerQuestion[] = [];

  if (!state.trip.region.city && !state.trip.region.country && !state.trip.region.freeText) {
    questions.push({
      id: "q_destination_region",
      text: "어디로 여행하고 싶어? (국가/도시)",
      options: [
        { label: "도쿄", value: "Tokyo, Japan" },
        { label: "오사카", value: "Osaka, Japan" },
        { label: "방콕", value: "Bangkok, Thailand" },
      ],
      allowFreeText: true,
    });
  }

  if (state.trip.constraints.mustVisit.length === 0) {
    questions.push({
      id: "q_must_visit",
      text: "필수 방문지가 있으면 알려줘.",
      options: [
        { label: "없음", value: "none" },
        { label: "랜드마크 1~2곳", value: "landmark" },
        { label: "쇼핑/맛집 위주", value: "food_shopping" },
      ],
      allowFreeText: true,
    });
  }

  return questions;
}

function buildDateQuestions(state: PlannerState): PlannerQuestion[] {
  const questions: PlannerQuestion[] = [];

  if (!state.trip.dates.start || !state.trip.dates.end) {
    questions.push({
      id: "q_date_range",
      text: "여행 날짜(출발/도착)를 알려줘.",
      options: [
        { label: "정해짐", value: "fixed_dates" },
        { label: "대략 이번 달", value: "this_month" },
        { label: "아직 미정", value: "undecided" },
      ],
      allowFreeText: true,
    });
  }

  if (state.trip.dates.flexibleDays === 0) {
    questions.push({
      id: "q_date_flexibility",
      text: "날짜는 며칠까지 유동적으로 조정 가능해?",
      options: [
        { label: "0일", value: "0" },
        { label: "±1~2일", value: "2" },
        { label: "±3일 이상", value: "3" },
      ],
      allowFreeText: true,
    });
  }

  return questions;
}

function buildWeightQuestions(state: PlannerState): PlannerQuestion[] {
  const questions: PlannerQuestion[] = [];

  if (!hasTravelers(state)) {
    questions.push({
      id: "q_travelers",
      text: "인원 구성을 알려줘.",
      options: [
        { label: "성인 1", value: "1_adult" },
        { label: "성인 2", value: "2_adults" },
        { label: "가족(아이 동반)", value: "family_with_child" },
      ],
      allowFreeText: true,
    });
  }

  if (!hasOriginOrUndecided(state)) {
    questions.push({
      id: "q_origin",
      text: "출발 공항/도시를 알려줘. 미정이면 '미정'이라고 답해줘.",
      options: [
        { label: "인천(ICN)", value: "ICN" },
        { label: "김포(GMP)", value: "GMP" },
        { label: "미정", value: "undecided" },
      ],
      allowFreeText: true,
    });
  }

  if (!hasBudgetOrComfort(state)) {
    questions.push({
      id: "q_comfort",
      text: "숙소/좌석 선호를 골라줘.",
      options: [
        { label: "가성비(3~4성/이코노미)", value: "budget" },
        { label: "중간(4성/이코노미+)", value: "balanced" },
        { label: "프리미엄(5성/비즈 이상)", value: "premium" },
      ],
      allowFreeText: true,
    });
  }

  if (state.trip.constraints.maxTransfers === null && !state.trip.constraints.avoidRedEye) {
    questions.push({
      id: "q_flight_constraints",
      text: "항공 제약이 있으면 골라줘.",
      options: [
        { label: "직항 우선", value: "direct" },
        { label: "1회 경유까지", value: "one_transfer" },
        { label: "야간편 피하기", value: "avoid_redeye" },
      ],
      allowFreeText: true,
    });
  }

  return questions;
}

interface QuestionOptions {
  avoidQuestionIds?: string[];
}

export function generateQuestions(
  stage: Stage,
  state: PlannerState,
  maxCount: number = 3,
  options?: QuestionOptions
): PlannerQuestion[] {
  let candidates: PlannerQuestion[] = [];

  if (stage === "collect_intent") {
    candidates = buildIntentQuestions(state);
  }

  if (stage === "collect_region") {
    candidates = buildRegionQuestions(state);
  }

  if (stage === "collect_dates") {
    candidates = buildDateQuestions(state);
  }

  if (stage === "collect_weights") {
    candidates = buildWeightQuestions(state);
  }

  const avoidSet = new Set(options?.avoidQuestionIds || []);
  const filtered = candidates.filter((question) => !avoidSet.has(question.id));
  const selected = filtered.length > 0 ? filtered : candidates;

  return selected.slice(0, maxCount);
}
