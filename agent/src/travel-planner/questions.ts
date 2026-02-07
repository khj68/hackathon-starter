import { PlannerQuestion, PlannerQuestionOption, PlannerState, Stage } from "./schema.js";
import {
  hasBudgetOrComfort,
  hasOriginOrUndecided,
  hasTravelers,
} from "./stage.js";

function option(label: string, value: string, reason: string): PlannerQuestionOption {
  return { label, value, reason };
}

function buildIntentQuestions(state: PlannerState): PlannerQuestion[] {
  const questions: PlannerQuestion[] = [];

  if (state.trip.purposeTags.length === 0) {
    questions.push({
      id: "q_trip_purpose",
      text: "이번 여행의 목적/분위기를 골라줘.",
      options: [
        option("휴양", "relax", "짧은 일정에서도 회복감이 큰 동선으로 잡기 좋음"),
        option("관광", "sightseeing", "대표 명소 중심으로 하루 동선을 구성하기 쉬움"),
        option("미식", "food", "지역별 맛집/카페 위주로 만족도를 높이기 쉬움"),
        option("비즈니스", "business", "이동 효율과 일정 안정성을 우선으로 맞출 수 있음"),
      ],
      allowFreeText: true,
    });
  }

  if (!state.trip.budgetStyle) {
    questions.push({
      id: "q_budget_style",
      text: "가격 vs 퀄리티 중 어디가 더 중요해?",
      options: [
        option("최저가", "budget", "항공/숙박 총비용을 빠르게 줄이기 좋음"),
        option("균형", "balanced", "가격과 만족도를 함께 맞추기 쉬운 기본 선택"),
        option("프리미엄", "premium", "휴식 품질과 편의성을 우선 확보할 수 있음"),
      ],
      allowFreeText: true,
    });
  }

  if (!state.trip.pace) {
    questions.push({
      id: "q_trip_pace",
      text: "일정을 어느 정도 밀도로 원해?",
      options: [
        option("여유롭게", "relaxed", "이동 부담이 적고 체력 소모를 낮출 수 있음"),
        option("균형", "balanced", "핵심 장소와 휴식 시간을 균형 있게 배치 가능"),
        option("빡빡하게", "tight", "짧은 기간에 더 많은 장소를 커버하기 좋음"),
      ],
      allowFreeText: true,
    });
  }

  return questions;
}

function buildRegionQuestions(state: PlannerState): PlannerQuestion[] {
  const questions: PlannerQuestion[] = [];

  if (!state.trip.region.city && !state.trip.region.country && !state.trip.region.freeText) {
    const shouldOfferDiverse = state.dialog.offerDiverseOptions || (state.dialog.questionAttempts["q_trip_purpose"] || 0) >= 1;

    questions.push({
      id: "q_destination_region",
      text: shouldOfferDiverse
        ? "취향이 아직 넓어서, 바로 떠나기 좋은 다양한 옵션을 먼저 제안할게. 어디가 끌려?"
        : "어디로 여행하고 싶어? (국가/도시)",
      options: shouldOfferDiverse
        ? [
            option("후쿠오카", "Fukuoka, Japan", "가깝고 이동이 편해 짧은 휴식 여행에 유리"),
            option("제주", "Jeju, South Korea", "자연/바다 중심으로 여유 일정 구성에 적합"),
            option("방콕", "Bangkok, Thailand", "가성비 숙소와 미식 선택지가 풍부"),
          ]
        : [
            option("도쿄", "Tokyo, Japan", "항공편이 많아 일정 유연성이 높음"),
            option("오사카", "Osaka, Japan", "가성비 숙소와 먹거리 동선 구성이 쉬움"),
            option("방콕", "Bangkok, Thailand", "휴양+도시 일정 모두 설계하기 좋음"),
          ],
      allowFreeText: true,
    });
  }

  if (state.trip.constraints.mustVisit.length === 0) {
    questions.push({
      id: "q_must_visit",
      text: "필수 방문지가 있으면 알려줘.",
      options: [
        option("없음", "none", "동선 효율 중심으로 최적화하기 쉬움"),
        option("랜드마크 1~2곳", "landmark", "핵심 장소만 넣어도 일정 만족도가 올라감"),
        option("쇼핑/맛집 위주", "food_shopping", "상권 중심으로 이동 시간을 줄일 수 있음"),
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
        option("정해짐", "fixed_dates", "항공/숙박 가격을 정확하게 비교 가능"),
        option("대략 이번 달", "this_month", "빠른 후보 탐색 후 날짜를 좁히기 좋음"),
        option("아직 미정", "undecided", "가성비 좋은 날짜부터 역으로 제안 가능"),
      ],
      allowFreeText: true,
    });
  }

  if (state.trip.dates.flexibleDays === 0) {
    questions.push({
      id: "q_date_flexibility",
      text: "날짜는 며칠까지 유동적으로 조정 가능해?",
      options: [
        option("0일", "0", "현재 날짜 기준으로 바로 확정 견적 가능"),
        option("±1~2일", "2", "가격/이동시간 개선 여지가 꽤 생김"),
        option("±3일 이상", "3", "최저가/최적 동선을 찾을 확률이 높아짐"),
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
        option("성인 1", "1_adult", "숙소/이동 옵션을 가장 넓게 탐색 가능"),
        option("성인 2", "2_adults", "커플/동행 맞춤 동선으로 최적화 가능"),
        option("가족(아이 동반)", "family_with_child", "이동 거리와 숙소 조건을 안전하게 조정 가능"),
      ],
      allowFreeText: true,
    });
  }

  if (!hasOriginOrUndecided(state)) {
    questions.push({
      id: "q_origin",
      text: "출발 공항/도시를 알려줘. 미정이면 '미정'이라고 답해줘.",
      options: [
        option("인천(ICN)", "ICN", "항공편 선택지가 가장 많아 비교가 빠름"),
        option("김포(GMP)", "GMP", "도심 접근성이 좋아 출발 동선이 짧음"),
        option("미정", "undecided", "도착지 기준으로 먼저 최적 항공을 탐색 가능"),
      ],
      allowFreeText: true,
    });
  }

  if (!hasBudgetOrComfort(state)) {
    questions.push({
      id: "q_comfort",
      text: "숙소/좌석 선호를 골라줘.",
      options: [
        option("가성비(3~4성/이코노미)", "budget", "총 예산을 낮추면서 기본 편의를 확보"),
        option("중간(4성/이코노미+)", "balanced", "가격과 컨디션을 균형 있게 유지"),
        option("프리미엄(5성/비즈 이상)", "premium", "휴식 품질과 이동 편의성을 최우선"),
      ],
      allowFreeText: true,
    });
  }

  if (state.trip.constraints.maxTransfers === null && !state.trip.constraints.avoidRedEye) {
    questions.push({
      id: "q_flight_constraints",
      text: "항공 제약이 있으면 골라줘.",
      options: [
        option("직항 우선", "direct", "전체 이동 피로도를 가장 크게 줄일 수 있음"),
        option("1회 경유까지", "one_transfer", "가격/시간 밸런스가 좋은 경우가 많음"),
        option("야간편 피하기", "avoid_redeye", "수면 리듬을 지켜 첫날 컨디션 유지 가능"),
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
