import { PlannerQuestion, PlannerState, Stage } from "./schema.js";
interface QuestionOptions {
    avoidQuestionIds?: string[];
}
export declare function generateQuestions(stage: Stage, state: PlannerState, maxCount?: number, options?: QuestionOptions): PlannerQuestion[];
export {};
