import { AgentResponse, AgentResponseSchema, EMPTY_RESULTS, PlannerState } from "./schema.js";
import { generateQuestions } from "./questions.js";
import { scoreFlights, scoreStays } from "./scoring.js";
import {
  canDraftRoute,
  canSearchFlights,
  canSearchStays,
  deriveStage,
  hasOriginOrUndecided,
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
  const match = text.match(/(?:유동|여유|flex)(?:\D{0,6})(\d{1,2})\s*일/i) || text.match(/\+\-\s*(\d{1,2})\s*일/i);
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

function parseRegion(text: string, state: PlannerState): void {
  const lower = text.toLowerCase();
  for (const candidate of CITY_COUNTRY_MAP) {
    if (candidate.aliases.some((alias) => lower.includes(alias))) {
      state.trip.region.city = candidate.city;
      state.trip.region.country = candidate.country;
      state.trip.region.freeText = `${candidate.city}, ${candidate.country}`;
      return;
    }
  }

  const freeTextMatch = text.match(/(?:여행지|목적지|destination)\s*[:：]?\s*([^\n.,]+)/i);
  if (freeTextMatch?.[1]) {
    state.trip.region.freeText = freeTextMatch[1].trim();
  }
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

  if (lower.includes("balanced")) {
    state.trip.budgetStyle = "balanced";
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

function applyTextUpdate(state: PlannerState, input: string): PlannerState {
  const text = input.trim();
  if (!text) return state;

  parseTravelers(text, state);
  parseRegion(text, state);
  parseOrigin(text, state);
  parseComfortChoices(text, state);
  parseConstraints(text, state);

  const parsedRange = parseDateRange(text);
  if (parsedRange) {
    state.trip.dates.start = parsedRange.start;
    state.trip.dates.end = parsedRange.end;
  }

  const flexibleDays = parseFlexibleDays(text);
  if (flexibleDays !== null) {
    state.trip.dates.flexibleDays = Math.max(0, flexibleDays);
  }

  const signals = inferPreferenceSignalsFromText(text);
  applyPreferenceSignals(state, signals);

  if (signals.budgetStyle && !state.trip.budgetStyle) {
    state.trip.budgetStyle = signals.budgetStyle;
  }

  return state;
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
  applyTextUpdate(state, userText);

  let stage = deriveStage(state);
  let results = JSON.parse(JSON.stringify(EMPTY_RESULTS)) as AgentResponse["results"];

  if (stage === "search") {
    const destination = getDestinationLabel(state);
    const origin = getOriginLabel(state);

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
    }

    if (canDraftRoute(state)) {
      results.routeDraft = await tools.draftRoute({
        destination,
        purposeTags: state.trip.purposeTags,
        mustVisit: state.trip.constraints.mustVisit,
        maxDailyWalkKm: state.trip.constraints.maxDailyWalkKm,
        days: diffDays(state.trip.dates.start, state.trip.dates.end),
      });
    }

    if (results.flights.length > 0 || results.stays.length > 0) {
      stage = "recommend";
    }
  }

  const questions = stage.startsWith("collect") ? generateQuestions(stage, state, 3) : [];

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
