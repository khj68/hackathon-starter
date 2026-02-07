import { PlannerState, Stage } from "./schema.js";

export function hasIntent(state: PlannerState): boolean {
  return state.trip.purposeTags.length > 0;
}

export function hasRegion(state: PlannerState): boolean {
  const { country, city, freeText } = state.trip.region;
  return Boolean(country || city || freeText);
}

export function hasDates(state: PlannerState): boolean {
  return Boolean(state.trip.dates.start && state.trip.dates.end);
}

export function hasTravelers(state: PlannerState): boolean {
  return state.trip.travelers.adults >= 1;
}

export function hasBudgetOrComfort(state: PlannerState): boolean {
  return Boolean(
    state.trip.budgetStyle || state.trip.stayLevel || state.trip.seatClass || state.trip.pace
  );
}

export function hasOriginOrUndecided(state: PlannerState): boolean {
  const { city, airportCode, freeText } = state.trip.origin;
  if (city || airportCode) return true;
  return freeText.trim().length > 0;
}

export function canSearchFlights(state: PlannerState): boolean {
  return hasRegion(state) && hasDates(state) && hasOriginOrUndecided(state);
}

export function canSearchStays(state: PlannerState): boolean {
  return hasRegion(state) && hasDates(state) && hasTravelers(state);
}

export function canDraftRoute(state: PlannerState): boolean {
  return hasRegion(state) && hasDates(state);
}

export function deriveStage(state: PlannerState): Stage {
  if (!hasIntent(state)) {
    return "collect_intent";
  }

  if (!hasRegion(state)) {
    return "collect_region";
  }

  if (!hasDates(state)) {
    return "collect_dates";
  }

  if (!hasTravelers(state) || !hasBudgetOrComfort(state) || !hasOriginOrUndecided(state)) {
    return "collect_weights";
  }

  if (canSearchFlights(state) || canSearchStays(state)) {
    return "search";
  }

  return "collect_weights";
}
