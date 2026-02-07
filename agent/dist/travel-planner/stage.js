export function hasIntent(state) {
    return state.trip.purposeTags.length > 0;
}
export function hasRegion(state) {
    const { country, city, freeText } = state.trip.region;
    return Boolean(country || city || freeText);
}
export function hasDates(state) {
    return Boolean(state.trip.dates.start && state.trip.dates.end);
}
export function hasTravelers(state) {
    return state.trip.travelers.adults >= 1;
}
export function hasBudgetOrComfort(state) {
    return Boolean(state.trip.budgetStyle || state.trip.stayLevel || state.trip.seatClass || state.trip.pace);
}
export function hasOriginOrUndecided(state) {
    const { city, airportCode, freeText } = state.trip.origin;
    if (city || airportCode)
        return true;
    return freeText.trim().length > 0;
}
export function canSearchFlights(state) {
    return hasRegion(state) && hasDates(state) && hasOriginOrUndecided(state);
}
export function canSearchStays(state) {
    return hasRegion(state) && hasDates(state) && hasTravelers(state);
}
export function canDraftRoute(state) {
    return (state.trip.purposeTags.length > 0 &&
        (state.trip.constraints.maxDailyWalkKm !== null ||
            state.trip.constraints.mustVisit.length > 0 ||
            state.trip.pace !== ""));
}
export function deriveStage(state) {
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
