import fs from "node:fs";
import path from "node:path";
import { INITIAL_STATE, PlannerStateSchema } from "./schema.js";
const STATE_RELATIVE_PATH = ".travel-planner/state.json";
function cloneInitialState() {
    return JSON.parse(JSON.stringify(INITIAL_STATE));
}
function mergeWithInitial(partial) {
    const base = cloneInitialState();
    if (!partial || typeof partial !== "object")
        return base;
    const obj = partial;
    return {
        ...base,
        ...obj,
        trip: {
            ...base.trip,
            ...(obj.trip || {}),
            region: { ...base.trip.region, ...(obj.trip?.region || {}) },
            dates: { ...base.trip.dates, ...(obj.trip?.dates || {}) },
            travelers: { ...base.trip.travelers, ...(obj.trip?.travelers || {}) },
            origin: { ...base.trip.origin, ...(obj.trip?.origin || {}) },
            constraints: { ...base.trip.constraints, ...(obj.trip?.constraints || {}) },
        },
        weights: { ...base.weights, ...(obj.weights || {}) },
        dialog: {
            ...base.dialog,
            ...(obj.dialog || {}),
            questionAttempts: {
                ...base.dialog.questionAttempts,
                ...(obj.dialog?.questionAttempts || {}),
            },
        },
    };
}
export function getStateFilePath(workspace) {
    return path.join(workspace, STATE_RELATIVE_PATH);
}
export function loadPlannerState(workspace) {
    const filePath = getStateFilePath(workspace);
    if (!fs.existsSync(filePath)) {
        return cloneInitialState();
    }
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        const merged = mergeWithInitial(parsed);
        const validated = PlannerStateSchema.safeParse(merged);
        if (!validated.success) {
            return cloneInitialState();
        }
        return validated.data;
    }
    catch {
        return cloneInitialState();
    }
}
export function savePlannerState(workspace, state) {
    const filePath = getStateFilePath(workspace);
    const dirPath = path.dirname(filePath);
    fs.mkdirSync(dirPath, { recursive: true });
    const validated = PlannerStateSchema.parse(state);
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), "utf-8");
}
