import { PlannerState } from "./schema.js";
export declare function getStateFilePath(workspace: string): string;
export declare function loadPlannerState(workspace: string): PlannerState;
export declare function savePlannerState(workspace: string, state: PlannerState): void;
