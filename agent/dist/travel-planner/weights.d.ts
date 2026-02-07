import { PlannerState } from "./schema.js";
export interface PreferenceSignals {
    budgetStyle?: "budget" | "balanced" | "premium";
    reviewFocus?: boolean;
    routeFocus?: boolean;
    locationFocus?: boolean;
    comfortFocus?: boolean;
    pace?: "tight" | "balanced" | "relaxed";
    purposeTags?: string[];
}
export declare function inferPreferenceSignalsFromText(text: string): PreferenceSignals;
export declare function applyPreferenceSignals(state: PlannerState, signals: PreferenceSignals): PlannerState;
