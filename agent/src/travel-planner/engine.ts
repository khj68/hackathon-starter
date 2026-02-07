import { AgentResponse, AgentResponseSchema, EMPTY_RESULTS, PlannerQuestion, PlannerState } from "./schema.js";
import { generateQuestions } from "./questions.js";
import { scoreFlights, scoreStays } from "./scoring.js";
import {
  canDraftRoute,
  canSearchFlights,
  canSearchStays,
  deriveStage,
  hasDates,
  hasIntent,
  hasOriginOrUndecided,
  hasRegion,
} from "./stage.js";
import { MockTravelToolProvider, TravelToolProvider } from "./tools.js";
import { applyPreferenceSignals, inferPreferenceSignalsFromText } from "./weights.js";

const CITY_COUNTRY_MAP: Array<{ city: string; country: string; aliases: string[] }> = [
  { city: "Tokyo", country: "Japan", aliases: ["도쿄", "tokyo"] },
  { city: "Osaka", country: "Japan", aliases: ["오사카", "osaka"] },
  { city: "Fukuoka", country: "Japan", aliases: ["후쿠오카", "fukuoka"] },
  { city: "Bangkok", country: "Thailand", aliases: ["방콕", "bangkok"] },
  { city: "Singapore", country: "Singapore", aliases: ["싱가포르", "singapore"] },
  { city: "Paris", country: "France", aliases: ["파리", "paris"] },
  { city: "London", country: "United Kingdom", aliases: ["런던", "london"] },
  { city: "New York", country: "United States", aliases: ["뉴욕", "new york"] },
  { city: "Jeju", country: "South Korea", aliases: ["제주", "jeju"] },
  { city: "Busan", country: "South Korea", aliases: ["부산", "busan"] },
];

const AIRPORT_MAP: Array<{ code: string; city: string; aliases: string[] }> = [
  { code: "ICN", city: "Seoul", aliases: ["인천", "icn"] },
  { code: "GMP", city: "Seoul", aliases: ["김포", "gmp"] },
  { code: "PUS", city: "Busan", aliases: ["김해", "pus", "부산"] },
  { code: "CJU", city: "Jeju", aliases: ["제주", "cju"] },
  { code: "NRT", city: "Tokyo", aliases: ["나리타", "nrt"] },
  { code: "HND", city: "Tokyo", aliases: ["하네다", "hnd"] },
];

const UNKNOWN_DESTINATION_TOKENS = ["모르겠", "미정", "아무데나", "상관없", "추천해줘"];
const URGENT_DEPARTURE_TOKENS = ["최대한 빨리", "빨리", "당장", "일주일 안", "이번 주", "곧"];
const ROUTE_YES_TOKENS = ["동선", "여행 경로", "일정 추천", "루트", "경로 추천", "지금 추천해줘", "route_yes"];
const ROUTE_NO_TOKENS = ["나중에", "아니", "괜찮", "패스", "지금 말고"];
const STAY_UNDECIDED_TOKENS = ["숙소 미정", "숙소는 미정", "미정", "아직 안 정함"];

function ensureDialogState(state: PlannerState): void {
  if (!state.dialog) {
    state.dialog = {
      lastAskedQuestionIds: [],
      questionAttempts: {},
      reasoningLog: [],
      assumptions: [],
      routeProposalAsked: false,
      routeAccepted: "unknown",
      stayQuestionAsked: false,
      offerDiverseOptions: false,
    };
    return;
  }

  state.dialog.lastAskedQuestionIds = state.dialog.lastAskedQuestionIds || [];
  state.dialog.questionAttempts = state.dialog.questionAttempts || {};
  state.dialog.reasoningLog = state.dialog.reasoningLog || [];
  state.dialog.assumptions = state.dialog.assumptions || [];
  state.dialog.routeProposalAsked = state.dialog.routeProposalAsked ?? false;
  state.dialog.routeAccepted = state.dialog.routeAccepted || "unknown";
  state.dialog.stayQuestionAsked = state.dialog.stayQuestionAsked ?? false;
  state.dialog.offerDiverseOptions = state.dialog.offerDiverseOptions ?? false;
}

function pushReasoning(state: PlannerState, message: string): void {
  ensureDialogState(state);
  state.dialog.reasoningLog.push(message);
  if (state.dialog.reasoningLog.length > 80) {
    state.dialog.reasoningLog = state.dialog.reasoningLog.slice(-80);
  }
}

function pushAssumption(state: PlannerState, message: string): void {
  ensureDialogState(state);
  state.dialog.assumptions.push(message);
  if (state.dialog.assumptions.length > 40) {
    state.dialog.assumptions = state.dialog.assumptions.slice(-40);
  }
  pushReasoning(state, `[가정] ${message}`);
}

function questionAttemptCount(state: PlannerState, questionId: string): number {
  ensureDialogState(state);
  return state.dialog.questionAttempts[questionId] || 0;
}

function rememberAskedQuestions(state: PlannerState, questionIds: string[]): void {
  ensureDialogState(state);
  state.dialog.lastAskedQuestionIds = questionIds;
  for (const id of questionIds) {
    state.dialog.questionAttempts[id] = (state.dialog.questionAttempts[id] || 0) + 1;
  }
}

function normalizeDateToken(token: string): string | null {
  const normalized = token.trim().replace(/[./]/g, "-");
  const fullMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fullMatch) {
    const [, year, month, day] = fullMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const shortMatch = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (shortMatch) {
    const now = new Date();
    const [, month, day] = shortMatch;
    const year = now.getUTCFullYear();
    return `${String(year)}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseTripDurationDays(text: string): number | null {
  const nightDayMatch = text.match(/(\d+)\s*박\s*(\d+)\s*일/);
  if (nightDayMatch) {
    const days = Number(nightDayMatch[2]);
    if (!Number.isNaN(days) && days >= 2 && days <= 14) {
      return days;
    }
  }

  const onlyDaysMatch = text.match(/(\d+)\s*일\s*(?:정도|쯤|로|가고|예정)?/);
  if (onlyDaysMatch) {
    const days = Number(onlyDaysMatch[1]);
    if (!Number.isNaN(days) && days >= 2 && days <= 14) {
      return days;
    }
  }

  return null;
}

function parseBudgetStyleFromAmount(text: string): PlannerState["trip"]["budgetStyle"] | null {
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*만\s*원/);
  if (!amountMatch?.[1]) return null;

  const amountInManwon = Number(amountMatch[1]);
  if (Number.isNaN(amountInManwon)) return null;

  if (amountInManwon <= 150) return "budget";
  if (amountInManwon <= 300) return "balanced";
  return "premium";
}

function parseDateRange(text: string): { start: string; end: string } | null {
  const rangeRegex = /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}).{0,12}(?:~|to|부터|까지|-|—|–).{0,12}(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2})/i;
  const match = text.match(rangeRegex);
  if (!match) {
    return null;
  }

  const start = normalizeDateToken(match[1] || "");
  const end = normalizeDateToken(match[2] || "");
  if (!start || !end) {
    return null;
  }

  return { start, end };
}

function parseFlexibleDays(text: string): number | null {
  const match =
    text.match(/(?:유동|여유|flex)(?:\D{0,6})(\d{1,2})\s*일/i) ||
    text.match(/\+\-\s*(\d{1,2})\s*일/i) ||
    text.match(/\u00B1\s*(\d{1,2})\s*일/i);
  if (!match) return null;
  return Number(match[1]);
}

function parseTravelers(text: string, state: PlannerState): void {
  const adultsMatch = text.match(/(?:성인|어른)\s*(\d{1,2})/);
  const childrenMatch = text.match(/(?:아이|아동|유아|어린이)\s*(\d{1,2})/);
  const genericMatch = text.match(/(\d{1,2})\s*명/);

  if (adultsMatch) {
    state.trip.travelers.adults = Math.max(1, Number(adultsMatch[1]));
  } else if (genericMatch && !childrenMatch) {
    state.trip.travelers.adults = Math.max(1, Number(genericMatch[1]));
  }

  if (childrenMatch) {
    state.trip.travelers.children = Number(childrenMatch[1]);
  }

  if (text.includes("가족")) {
    state.trip.travelers.notes = "family";
  }

  if (text.includes("커플") || text.includes("연인")) {
    state.trip.travelers.notes = "couple";
  }

  if (text.includes("혼자") || text.includes("솔로")) {
    state.trip.travelers.adults = 1;
    state.trip.travelers.notes = "solo";
  }
}

function parseRegion(text: string, state: PlannerState): { matched: boolean; undecided: boolean } {
  const lower = text.toLowerCase();
  const undecided = UNKNOWN_DESTINATION_TOKENS.some((token) => lower.includes(token));

  if (undecided) {
    state.trip.region.city = "";
    state.trip.region.country = "";
    state.trip.region.freeText = "";
    return { matched: false, undecided: true };
  }

  for (const candidate of CITY_COUNTRY_MAP) {
    if (candidate.aliases.some((alias) => lower.includes(alias))) {
      state.trip.region.city = candidate.city;
      state.trip.region.country = candidate.country;
      state.trip.region.freeText = `${candidate.city}, ${candidate.country}`;
      return { matched: true, undecided: false };
    }
  }

  const freeTextMatch = text.match(/(?:여행지|목적지|destination)\s*[:：]?\s*([^\n.,]+)/i);
  if (freeTextMatch?.[1]) {
    const candidate = freeTextMatch[1].trim();
    if (!UNKNOWN_DESTINATION_TOKENS.some((token) => candidate.toLowerCase().includes(token))) {
      state.trip.region.freeText = candidate;
      return { matched: true, undecided: false };
    }
  }

  return { matched: false, undecided: false };
}

function parseOrigin(text: string, state: PlannerState): void {
  const lower = text.toLowerCase();
  if (lower.includes("미정") || lower.includes("undecided")) {
    state.trip.origin.freeText = "미정";
    return;
  }

  for (const candidate of AIRPORT_MAP) {
    if (candidate.aliases.some((alias) => lower.includes(alias))) {
      state.trip.origin.airportCode = candidate.code;
      state.trip.origin.city = candidate.city;
      state.trip.origin.freeText = `${candidate.city} (${candidate.code})`;
      return;
    }
  }
}

function parseComfortChoices(text: string, state: PlannerState): void {
  const lower = text.toLowerCase();

  if (lower.includes("3성")) state.trip.stayLevel = "3_star";
  if (lower.includes("4성")) state.trip.stayLevel = "4_star";
  if (lower.includes("5성")) state.trip.stayLevel = "5_star";
  if (lower.includes("풀빌라")) state.trip.stayLevel = "pool_villa";

  if (lower.includes("이코노미")) state.trip.seatClass = "economy";
  if (lower.includes("비즈")) state.trip.seatClass = "business";
  if (lower.includes("퍼스트")) state.trip.seatClass = "first";

  if (lower.includes("budget")) {
    state.trip.budgetStyle = "budget";
    if (!state.trip.seatClass) state.trip.seatClass = "economy";
  }

  if (lower.includes("premium")) {
    state.trip.budgetStyle = "premium";
    if (!state.trip.stayLevel) state.trip.stayLevel = "5_star";
    if (!state.trip.seatClass) state.trip.seatClass = "business";
  }

  if (lower.includes("balanced") || lower.includes("균형")) {
    state.trip.budgetStyle = "balanced";
  }
}

function parseStayLocationPreference(text: string, state: PlannerState): void {
  const lower = text.toLowerCase();

  if (STAY_UNDECIDED_TOKENS.some((token) => lower.includes(token))) {
    state.trip.stay.decided = false;
    state.trip.stay.area = "";
    state.trip.stay.notes = "undecided";
    return;
  }

  if (lower.includes("시내")) {
    state.trip.stay.decided = true;
    state.trip.stay.area = "시내 중심";
    return;
  }

  if (lower.includes("역세권") || lower.includes("교통")) {
    state.trip.stay.decided = true;
    state.trip.stay.area = "역세권";
    return;
  }

  if (lower.includes("해변") || lower.includes("바다")) {
    state.trip.stay.decided = true;
    state.trip.stay.area = "해변 근처";
    return;
  }

  const explicitStayArea = text.match(/(?:숙소|호텔)\s*(?:위치|지역)?\s*(?:는|은|:)?\s*([^\n.,]+)/i);
  if (explicitStayArea?.[1]) {
    state.trip.stay.decided = true;
    state.trip.stay.area = explicitStayArea[1].trim();
  }
}

function parseRoutePreference(text: string, state: PlannerState): void {
  const lower = text.toLowerCase();
  if (ROUTE_NO_TOKENS.some((token) => lower.includes(token))) {
    state.dialog.routeAccepted = "no";
    return;
  }

  if (lower.includes("숙소 먼저")) {
    state.dialog.routeAccepted = "yes";
    return;
  }

  const routeIntent =
    ROUTE_YES_TOKENS.some((token) => lower.includes(token)) ||
    /(여행\s*경로|동선|루트|itinerary)/i.test(text);

  if (routeIntent) {
    state.dialog.routeAccepted = "yes";
  }
}

function parseConstraints(text: string, state: PlannerState): void {
  const lower = text.toLowerCase();

  if (lower.includes("직항")) {
    state.trip.constraints.maxTransfers = 0;
  }

  const transferMatch = text.match(/(\d)\s*회\s*경유/);
  if (transferMatch?.[1]) {
    state.trip.constraints.maxTransfers = Number(transferMatch[1]);
  }

  if (lower.includes("야간") || lower.includes("red eye") || lower.includes("redeye")) {
    state.trip.constraints.avoidRedEye = true;
  }

  const walkMatch = text.match(/(\d+(?:\.\d+)?)\s*km/i);
  if (walkMatch?.[1]) {
    state.trip.constraints.maxDailyWalkKm = Number(walkMatch[1]);
  }

  const mustVisitMatch = text.match(/(?:필수\s*방문지|꼭\s*가고\s*싶은\s*곳|must\s*visit)\s*[:：]?\s*([^\n]+)/i);
  if (mustVisitMatch?.[1]) {
    const places = mustVisitMatch[1]
      .split(/[,/|]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (places.length > 0 && !places.includes("none")) {
      state.trip.constraints.mustVisit = places;
    }
  }
}

function applyUrgentDateHeuristic(state: PlannerState, text: string): boolean {
  const lower = text.toLowerCase();
  const isUrgent = URGENT_DEPARTURE_TOKENS.some((token) => lower.includes(token));
  const durationDays = parseTripDurationDays(text) || 4;

  if (!isUrgent && !lower.includes("일주일")) {
    return false;
  }

  if (state.trip.dates.start && state.trip.dates.end) {
    return false;
  }

  const now = new Date();
  const startDate = addDays(now, 1);
  const endDate = addDays(startDate, Math.max(1, durationDays - 1));

  state.trip.dates.start = formatDate(startDate);
  state.trip.dates.end = formatDate(endDate);
  if (state.trip.dates.flexibleDays === 0) {
    state.trip.dates.flexibleDays = lower.includes("일주일") ? 3 : 1;
  }

  return true;
}

function applyTextUpdate(state: PlannerState, input: string): PlannerState {
  const text = input.trim();
  if (!text) return state;

  const beforePurposeCount = state.trip.purposeTags.length;
  const beforeRegion = state.trip.region.freeText;

  parseTravelers(text, state);
  const regionResult = parseRegion(text, state);
  parseOrigin(text, state);
  parseComfortChoices(text, state);
  parseStayLocationPreference(text, state);
  parseRoutePreference(text, state);
  parseConstraints(text, state);

  const parsedRange = parseDateRange(text);
  if (parsedRange) {
    state.trip.dates.start = parsedRange.start;
    state.trip.dates.end = parsedRange.end;
    pushReasoning(state, `사용자 입력에서 날짜 범위(${parsedRange.start}~${parsedRange.end})를 추출함`);
  }

  const flexibleDays = parseFlexibleDays(text);
  if (flexibleDays !== null) {
    state.trip.dates.flexibleDays = Math.max(0, flexibleDays);
    pushReasoning(state, `날짜 유동성 ±${state.trip.dates.flexibleDays}일로 반영함`);
  }

  if (applyUrgentDateHeuristic(state, text)) {
    pushReasoning(state, `급출발 표현을 기반으로 ${state.trip.dates.start}~${state.trip.dates.end} 임시 일정으로 설정함`);
  }

  const signals = inferPreferenceSignalsFromText(text);
  applyPreferenceSignals(state, signals);

  if (!state.trip.budgetStyle) {
    const budgetFromAmount = parseBudgetStyleFromAmount(text);
    if (budgetFromAmount) {
      state.trip.budgetStyle = budgetFromAmount;
      pushReasoning(state, `예산 언급(만원 단위) 기반으로 '${budgetFromAmount}' 성향을 반영함`);
    }
  }

  if (signals.budgetStyle) {
    pushReasoning(state, `예산 성향을 '${signals.budgetStyle}'로 업데이트함`);
  }

  if (signals.purposeTags && signals.purposeTags.length > 0) {
    pushReasoning(state, `여행 목적 태그(${signals.purposeTags.join(", ")})를 인식함`);
  }

  if (regionResult.undecided) {
    pushReasoning(state, "목적지가 아직 미정이라는 답변을 감지함");
  } else if (state.trip.region.freeText && beforeRegion !== state.trip.region.freeText) {
    pushReasoning(state, `목적지를 '${state.trip.region.freeText}'로 인식함`);
  }

  if (beforePurposeCount === 0 && state.trip.purposeTags.length > 0) {
    pushReasoning(state, "여행 목적 정보가 채워져 intent 질문을 축소할 수 있음");
  }

  return state;
}

function chooseFallbackRegion(state: PlannerState): { city: string; country: string; reason: string } {
  if (state.trip.budgetStyle === "budget" && state.trip.purposeTags.includes("relax")) {
    return { city: "Fukuoka", country: "Japan", reason: "가성비+휴식 조합에서 단거리/비용 균형이 좋아 우선 제안" };
  }

  if (state.trip.budgetStyle === "budget") {
    return { city: "Osaka", country: "Japan", reason: "가성비 우선 기준으로 항공/숙박 옵션이 풍부한 목적지" };
  }

  if (state.trip.purposeTags.includes("relax")) {
    return { city: "Jeju", country: "South Korea", reason: "휴식 목적 기준으로 이동 부담이 낮은 목적지" };
  }

  return { city: "Tokyo", country: "Japan", reason: "목적지 미정 시 기본 탐색 목적지" };
}

function applyAmbiguityAssumptions(state: PlannerState, userText: string, stage: AgentResponse["stage"]): void {
  const lower = userText.toLowerCase();

  if (stage === "collect_intent" && !hasIntent(state)) {
    const attempts = questionAttemptCount(state, "q_trip_purpose");
    if (attempts >= 1) {
      state.dialog.offerDiverseOptions = true;
      if (state.trip.purposeTags.length === 0) {
        if (/(휴식|쉬러|힐링|쉬고)/i.test(userText)) {
          state.trip.purposeTags = ["relax"];
        } else {
          state.trip.purposeTags = ["relax", "sightseeing"];
        }
        pushAssumption(state, `목적 응답이 모호해 기본 목적을 '${state.trip.purposeTags[0]}'로 가정함`);
      }

      if (!state.trip.budgetStyle) {
        const parsed = parseBudgetStyleFromAmount(userText);
        state.trip.budgetStyle = parsed || "balanced";
        pushAssumption(state, `예산 정보가 불완전해 '${state.trip.budgetStyle}' 성향으로 임시 설정함`);
      }

      if (!state.trip.pace) {
        state.trip.pace = /(후딱|빨리|타이트)/i.test(userText) ? "tight" : "balanced";
        pushAssumption(state, `일정 밀도를 '${state.trip.pace}'로 임시 설정함`);
      }
    }
  }

  if (stage === "collect_region" && !hasRegion(state)) {
    const attempts = questionAttemptCount(state, "q_destination_region");
    const userUndecided = UNKNOWN_DESTINATION_TOKENS.some((token) => lower.includes(token));

    if (userUndecided || attempts >= 1) {
      const fallback = chooseFallbackRegion(state);
      state.trip.region.city = fallback.city;
      state.trip.region.country = fallback.country;
      state.trip.region.freeText = `${fallback.city}, ${fallback.country}`;
      pushAssumption(state, `목적지가 미정이라 '${fallback.city}' 기준으로 우선 검색을 진행함 (${fallback.reason})`);
    }
  }

  if (stage === "collect_dates" && !hasDates(state)) {
    const attempts = questionAttemptCount(state, "q_date_range");
    const durationDays = parseTripDurationDays(userText);
    const urgent = URGENT_DEPARTURE_TOKENS.some((token) => lower.includes(token));

    if (urgent || attempts >= 1 || durationDays !== null) {
      const base = addDays(new Date(), 1);
      const days = durationDays || 4;
      state.trip.dates.start = formatDate(base);
      state.trip.dates.end = formatDate(addDays(base, Math.max(1, days - 1)));
      if (state.trip.dates.flexibleDays === 0) {
        state.trip.dates.flexibleDays = lower.includes("일주일") ? 3 : 1;
      }
      pushAssumption(state, `정확한 날짜가 없어 ${state.trip.dates.start} 출발 가정으로 ${days}일 일정을 임시 확정함`);
    }
  }

  if (stage === "collect_weights" && !hasOriginOrUndecided(state)) {
    const attempts = questionAttemptCount(state, "q_origin");
    if (attempts >= 1) {
      state.trip.origin.freeText = "미정";
      pushAssumption(state, "출발지가 비어 있어 항공 검색은 '출발지 미정' 조건으로 진행함");
    }
  }
}

function getDestinationLabel(state: PlannerState): string {
  return state.trip.region.city || state.trip.region.freeText || "Destination";
}

function getOriginLabel(state: PlannerState): string {
  if (state.trip.origin.airportCode) {
    return state.trip.origin.airportCode;
  }
  if (state.trip.origin.city) {
    return state.trip.origin.city;
  }
  if (state.trip.origin.freeText) {
    return state.trip.origin.freeText;
  }
  return "미정";
}

function diffDays(start: string, end: string): number {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return 1;
  }
  return Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
}

function chooseSuggestedStayArea(state: PlannerState): string {
  if (state.trip.stay.area) return state.trip.stay.area;
  if (state.trip.purposeTags.includes("relax")) return "해변 근처";
  if (state.trip.purposeTags.includes("food")) return "핫플 상권 근처";
  if (state.weights.route >= 0.3) return "역세권";
  return "시내 중심";
}

function buildRecommendQuestions(state: PlannerState): PlannerQuestion[] {
  const questions: PlannerQuestion[] = [];

  if (hasRegion(state) && state.dialog.routeAccepted === "unknown") {
    questions.push({
      id: "q_route_offer",
      text: "여행 경로 추천도 같이 진행할까?",
      options: [
        { label: "지금 추천해줘", value: "route_yes", reason: "항공/숙소 후보 기준으로 바로 일자별 동선을 만들 수 있음" },
        { label: "숙소 먼저 고를래", value: "stay_first", reason: "숙소 위치를 확정하면 이동 동선을 더 정확히 최적화 가능" },
        { label: "나중에 볼게", value: "route_later", reason: "지금은 항공/숙소 비교에만 집중할 수 있음" },
      ],
      allowFreeText: true,
    });
  }

  if (
    state.dialog.routeAccepted === "yes" &&
    !state.trip.stay.decided &&
    (state.dialog.questionAttempts["q_route_stay_area"] || 0) === 0
  ) {
    questions.push({
      id: "q_route_stay_area",
      text: "여행 경로 최적화를 위해 숙소 위치가 정해졌는지 알려줘.",
      options: [
        { label: "시내 중심으로 잡아줘", value: "stay_center", reason: "관광/식당 접근성이 좋아 첫 방문자 일정에 안정적" },
        { label: "역세권 위주로", value: "stay_transit", reason: "대중교통 이동 시간이 줄어 동선 효율이 높아짐" },
        { label: "해변/자연 근처로", value: "stay_scenic", reason: "휴양 중심 일정에서 체류 만족도가 높아짐" },
        { label: "아직 미정", value: "stay_undecided", reason: "취향 기반으로 추천 숙소 위치까지 함께 제안 가능" },
      ],
      allowFreeText: true,
    });
  }

  return questions.slice(0, 2);
}

function buildUICards(results: AgentResponse["results"]): AgentResponse["ui"]["cards"] {
  const cards: AgentResponse["ui"]["cards"] = [];

  for (const flight of results.flights.slice(0, 2)) {
    cards.push({ type: "flight", refId: flight.id, ctaLabel: "예매하러 가기" });
  }

  for (const stay of results.stays.slice(0, 2)) {
    cards.push({ type: "stay", refId: stay.id, ctaLabel: "예약하러 가기" });
  }

  return cards;
}

function questionsAreRepeated(state: PlannerState, questionIds: string[]): boolean {
  if (questionIds.length === 0) return false;
  const prev = state.dialog.lastAskedQuestionIds || [];
  if (prev.length === 0) return false;
  return questionIds.every((id) => prev.includes(id));
}

export interface PlannerEngineOutput {
  state: PlannerState;
  response: AgentResponse;
}

export async function runPlannerEngine(
  prevState: PlannerState,
  userText: string,
  tools: TravelToolProvider = new MockTravelToolProvider()
): Promise<PlannerEngineOutput> {
  const state: PlannerState = JSON.parse(JSON.stringify(prevState));
  ensureDialogState(state);
  applyTextUpdate(state, userText);

  let stage = deriveStage(state);
  applyAmbiguityAssumptions(state, userText, stage);
  stage = deriveStage(state);

  let results = JSON.parse(JSON.stringify(EMPTY_RESULTS)) as AgentResponse["results"];

  if (stage === "search") {
    const destination = getDestinationLabel(state);
    const origin = getOriginLabel(state);

    pushReasoning(state, `도구 조회 시작: destination='${destination}', origin='${origin}'`);

    if (canSearchFlights(state)) {
      const flights = await tools.searchFlights({
        origin,
        destination,
        startDate: state.trip.dates.start,
        endDate: state.trip.dates.end,
        adults: state.trip.travelers.adults,
        children: state.trip.travelers.children,
        seatClass: state.trip.seatClass || "economy",
        maxTransfers: state.trip.constraints.maxTransfers,
      });
      results.flights = scoreFlights(state, flights);
      pushReasoning(state, `항공 후보 ${results.flights.length}건 스코어링 완료`);
    }

    if (canSearchStays(state)) {
      const stays = await tools.searchStays({
        destination,
        startDate: state.trip.dates.start,
        endDate: state.trip.dates.end,
        adults: state.trip.travelers.adults,
        children: state.trip.travelers.children,
        stayLevel: state.trip.stayLevel,
      });
      results.stays = scoreStays(state, stays);
      pushReasoning(state, `숙소 후보 ${results.stays.length}건 스코어링 완료`);
    }

    if (state.dialog.routeAccepted === "yes" && state.trip.stay.decided && canDraftRoute(state)) {
      results.routeDraft = await tools.draftRoute({
        destination,
        purposeTags: state.trip.purposeTags,
        mustVisit: state.trip.constraints.mustVisit,
        maxDailyWalkKm: state.trip.constraints.maxDailyWalkKm,
        days: diffDays(state.trip.dates.start, state.trip.dates.end),
        stayArea: state.trip.stay.decided ? state.trip.stay.area : chooseSuggestedStayArea(state),
      });
      pushReasoning(state, `동선 초안 ${results.routeDraft.length}일 생성`);
    } else if (
      state.dialog.routeAccepted === "yes" &&
      !state.trip.stay.decided &&
      state.dialog.stayQuestionAsked &&
      questionAttemptCount(state, "q_route_stay_area") >= 1
    ) {
      const suggestedArea = chooseSuggestedStayArea(state);
      state.trip.stay.area = suggestedArea;
      state.trip.stay.decided = false;
      pushAssumption(state, `숙소 위치 미정이라 '${suggestedArea}' 기준으로 경로/숙소 추천을 준비함`);
      results.routeDraft = await tools.draftRoute({
        destination,
        purposeTags: state.trip.purposeTags,
        mustVisit: state.trip.constraints.mustVisit,
        maxDailyWalkKm: state.trip.constraints.maxDailyWalkKm,
        days: diffDays(state.trip.dates.start, state.trip.dates.end),
        stayArea: suggestedArea,
      });
      pushReasoning(state, `숙소 위치 추정 기반으로 동선 ${results.routeDraft.length}일을 생성함`);
    }

    if (results.flights.length > 0 || results.stays.length > 0) {
      stage = "recommend";
      pushReasoning(state, "핵심 후보가 확보되어 추천 단계로 전환함");
    }
  }

  let questions = stage.startsWith("collect")
    ? generateQuestions(stage, state, 3, { avoidQuestionIds: state.dialog.lastAskedQuestionIds })
    : [];

  if (stage.startsWith("collect") && questions.length === 0) {
    questions = generateQuestions(stage, state, 3);
  }

  if (stage.startsWith("collect") && questionsAreRepeated(state, questions.map((item) => item.id))) {
    applyAmbiguityAssumptions(state, userText, stage);
    stage = deriveStage(state);
    if (stage.startsWith("collect")) {
      questions = generateQuestions(stage, state, 3, { avoidQuestionIds: state.dialog.lastAskedQuestionIds });
    } else {
      questions = [];
    }
  }

  if (stage === "collect_weights" && !hasOriginOrUndecided(state)) {
    const existingOriginQuestion = questions.find((question) => question.id === "q_origin");
    if (!existingOriginQuestion) {
      questions.unshift({
        id: "q_origin",
        text: "출발 공항/도시를 알려줘. 미정이면 '미정'으로 답해줘.",
        options: [
          { label: "인천(ICN)", value: "ICN" },
          { label: "김포(GMP)", value: "GMP" },
          { label: "미정", value: "undecided" },
        ],
        allowFreeText: true,
      });
    }
  }

  if (stage === "recommend") {
    if (state.dialog.routeAccepted === "unknown" && questionAttemptCount(state, "q_route_offer") >= 1) {
      state.dialog.routeAccepted = "yes";
      pushAssumption(state, "경로 제안 질문 응답이 모호해 기본적으로 경로 추천을 계속 진행함");
    }

    if (state.dialog.routeAccepted === "yes" && !state.trip.stay.decided && questionAttemptCount(state, "q_route_stay_area") >= 1) {
      const suggestedArea = chooseSuggestedStayArea(state);
      state.trip.stay.area = suggestedArea;
      pushAssumption(state, `숙소 위치 답변이 모호해 '${suggestedArea}' 기준으로 경로를 우선 제안함`);
    }

    const recommendQuestions = buildRecommendQuestions(state);
    if (recommendQuestions.length > 0) {
      questions = recommendQuestions;
      if (recommendQuestions.some((question) => question.id === "q_route_offer")) {
        state.dialog.routeProposalAsked = true;
      }
      if (recommendQuestions.some((question) => question.id === "q_route_stay_area")) {
        state.dialog.stayQuestionAsked = true;
      }
    } else if (
      state.dialog.routeAccepted === "yes" &&
      results.routeDraft.length === 0 &&
      canDraftRoute(state) &&
      (state.trip.stay.decided ||
        (state.dialog.stayQuestionAsked && questionAttemptCount(state, "q_route_stay_area") >= 1))
    ) {
      const destination = getDestinationLabel(state);
      results.routeDraft = await tools.draftRoute({
        destination,
        purposeTags: state.trip.purposeTags,
        mustVisit: state.trip.constraints.mustVisit,
        maxDailyWalkKm: state.trip.constraints.maxDailyWalkKm,
        days: diffDays(state.trip.dates.start, state.trip.dates.end),
        stayArea: state.trip.stay.decided ? state.trip.stay.area : chooseSuggestedStayArea(state),
      });
      pushReasoning(state, `경로 추천 요청에 따라 동선 ${results.routeDraft.length}일을 생성함`);
    }
  }

  rememberAskedQuestions(state, questions.slice(0, 3).map((question) => question.id));

  const response: AgentResponse = {
    type: "agent_response",
    stage,
    questions: questions.slice(0, 3),
    state,
    results,
    ui: {
      cards: buildUICards(results),
    },
  };

  const validated = AgentResponseSchema.parse(response);
  return {
    state,
    response: validated,
  };
}
