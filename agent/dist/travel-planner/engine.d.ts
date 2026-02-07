import { AgentResponse, PlannerState } from "./schema.js";
import { TravelToolProvider } from "./tools.js";
export interface PlannerEngineOutput {
    state: PlannerState;
    response: AgentResponse;
}
export declare function runPlannerEngine(prevState: PlannerState, userText: string, tools?: TravelToolProvider): Promise<PlannerEngineOutput>;
