import { FlightResult, PlannerState, StayResult } from "./schema.js";
export declare function scoreFlights(state: PlannerState, flights: FlightResult[]): FlightResult[];
export declare function scoreStays(state: PlannerState, stays: StayResult[]): StayResult[];
