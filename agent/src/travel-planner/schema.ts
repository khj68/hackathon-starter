import { z } from "zod";

export const StageSchema = z.enum([
  "collect_intent",
  "collect_dates",
  "collect_region",
  "collect_weights",
  "search",
  "recommend",
]);

export const QuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  options: z.array(QuestionOptionSchema).min(1),
  allowFreeText: z.boolean(),
});

const DateStringSchema = z
  .string()
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/);

export const TripSchema = z.object({
  region: z.object({
    country: z.string().default(""),
    city: z.string().default(""),
    freeText: z.string().default(""),
  }),
  dates: z.object({
    start: DateStringSchema.default(""),
    end: DateStringSchema.default(""),
    flexibleDays: z.number().int().min(0).default(0),
  }),
  travelers: z.object({
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    notes: z.string().default(""),
  }),
  origin: z.object({
    city: z.string().default(""),
    airportCode: z.string().default(""),
    freeText: z.string().default(""),
  }),
  purposeTags: z.array(z.string()).default([]),
  budgetStyle: z.enum(["", "budget", "balanced", "premium"]).default(""),
  stayLevel: z.enum(["", "3_star", "4_star", "5_star", "pool_villa"]).default(""),
  seatClass: z.enum(["", "economy", "business", "first"]).default(""),
  pace: z.enum(["", "tight", "balanced", "relaxed"]).default(""),
  constraints: z.object({
    maxTransfers: z.number().int().min(0).nullable().default(null),
    avoidRedEye: z.boolean().default(false),
    maxDailyWalkKm: z.number().positive().nullable().default(null),
    mustVisit: z.array(z.string()).default([]),
  }),
});

export const WeightsSchema = z.object({
  price: z.number().min(0).max(1),
  review: z.number().min(0).max(1),
  route: z.number().min(0).max(1),
  location: z.number().min(0).max(1),
  comfort: z.number().min(0).max(1),
});

export const WeightKeySchema = z.enum([
  "price",
  "review",
  "route",
  "location",
  "comfort",
]);

export const WeightRationaleSchema = z.object({
  key: WeightKeySchema,
  reason: z.string().min(1),
});

export const DialogStateSchema = z.object({
  lastAskedQuestionIds: z.array(z.string()).default([]),
  questionAttempts: z.record(z.string(), z.number().int().min(0)).default({}),
  reasoningLog: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
});

export const PlannerStateSchema = z.object({
  trip: TripSchema,
  weights: WeightsSchema,
  weightRationale: z.array(WeightRationaleSchema),
  dialog: DialogStateSchema.default({
    lastAskedQuestionIds: [],
    questionAttempts: {},
    reasoningLog: [],
    assumptions: [],
  }),
});

export const PriceSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().min(1),
});

export const FlightResultSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  price: PriceSchema,
  provider: z.string().min(1),
  score: z.number().min(0).max(1),
  url: z.string().url(),
  badges: z.array(z.string()),
  transfers: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(1).optional(),
});

export const StayResultSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rating: z.number().min(0).max(5),
  pricePerNight: PriceSchema,
  location: z.object({
    area: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
  }),
  provider: z.string().min(1),
  score: z.number().min(0).max(1),
  url: z.string().url(),
  badges: z.array(z.string()),
});

export const RouteItemSchema = z.object({
  time: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["flight", "stay", "place", "move", "meal", "activity"]),
  url: z.string().url().optional(),
});

export const RouteDraftDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().min(1),
  items: z.array(RouteItemSchema),
});

export const ResultsSchema = z.object({
  flights: z.array(FlightResultSchema),
  stays: z.array(StayResultSchema),
  routeDraft: z.array(RouteDraftDaySchema),
});

export const UICardSchema = z.object({
  type: z.enum(["flight", "stay", "place"]),
  refId: z.string().min(1),
  ctaLabel: z.string().min(1),
});

export const AgentResponseSchema = z.object({
  type: z.literal("agent_response"),
  stage: StageSchema,
  questions: z.array(QuestionSchema),
  state: PlannerStateSchema,
  results: ResultsSchema,
  ui: z.object({
    cards: z.array(UICardSchema),
  }),
});

export type Stage = z.infer<typeof StageSchema>;
export type WeightKey = z.infer<typeof WeightKeySchema>;
export type PlannerState = z.infer<typeof PlannerStateSchema>;
export type PlannerWeights = z.infer<typeof WeightsSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type PlannerQuestion = z.infer<typeof QuestionSchema>;
export type FlightResult = z.infer<typeof FlightResultSchema>;
export type StayResult = z.infer<typeof StayResultSchema>;
export type RouteDraftDay = z.infer<typeof RouteDraftDaySchema>;

export const DEFAULT_WEIGHTS: PlannerWeights = {
  price: 0.25,
  review: 0.25,
  route: 0.25,
  location: 0.25,
  comfort: 0.25,
};

export const EMPTY_RESULTS: AgentResponse["results"] = {
  flights: [],
  stays: [],
  routeDraft: [],
};

export const INITIAL_STATE: PlannerState = {
  trip: {
    region: { country: "", city: "", freeText: "" },
    dates: { start: "", end: "", flexibleDays: 0 },
    travelers: { adults: 1, children: 0, notes: "" },
    origin: { city: "", airportCode: "", freeText: "" },
    purposeTags: [],
    budgetStyle: "",
    stayLevel: "",
    seatClass: "",
    pace: "",
    constraints: {
      maxTransfers: null,
      avoidRedEye: false,
      maxDailyWalkKm: null,
      mustVisit: [],
    },
  },
  weights: DEFAULT_WEIGHTS,
  weightRationale: [],
  dialog: {
    lastAskedQuestionIds: [],
    questionAttempts: {},
    reasoningLog: [],
    assumptions: [],
  },
};
