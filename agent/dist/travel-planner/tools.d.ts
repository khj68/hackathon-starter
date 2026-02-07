import { FlightResult, RouteDraftDay, StayResult } from "./schema.js";
export interface FlightSearchInput {
    origin: string;
    destination: string;
    startDate: string;
    endDate: string;
    adults: number;
    children: number;
    seatClass: string;
    maxTransfers: number | null;
}
export interface StaySearchInput {
    destination: string;
    startDate: string;
    endDate: string;
    adults: number;
    children: number;
    stayLevel: string;
}
export interface RouteDraftInput {
    destination: string;
    purposeTags: string[];
    mustVisit: string[];
    maxDailyWalkKm: number | null;
    days: number;
}
export interface TravelToolProvider {
    searchFlights(input: FlightSearchInput): Promise<FlightResult[]>;
    searchStays(input: StaySearchInput): Promise<StayResult[]>;
    draftRoute(input: RouteDraftInput): Promise<RouteDraftDay[]>;
}
export declare class MockTravelToolProvider implements TravelToolProvider {
    searchFlights(input: FlightSearchInput): Promise<FlightResult[]>;
    searchStays(input: StaySearchInput): Promise<StayResult[]>;
    draftRoute(input: RouteDraftInput): Promise<RouteDraftDay[]>;
}
