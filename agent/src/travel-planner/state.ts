import fs from "node:fs";
import path from "node:path";
import { INITIAL_STATE, PlannerState, PlannerStateSchema } from "./schema.js";

const STATE_RELATIVE_PATH = ".travel-planner/state.json";

function cloneInitialState(): PlannerState {
  return JSON.parse(JSON.stringify(INITIAL_STATE)) as PlannerState;
}

export function getStateFilePath(workspace: string): string {
  return path.join(workspace, STATE_RELATIVE_PATH);
}

export function loadPlannerState(workspace: string): PlannerState {
  const filePath = getStateFilePath(workspace);

  if (!fs.existsSync(filePath)) {
    return cloneInitialState();
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = PlannerStateSchema.safeParse(parsed);
    if (!validated.success) {
      return cloneInitialState();
    }
    return validated.data;
  } catch {
    return cloneInitialState();
  }
}

export function savePlannerState(workspace: string, state: PlannerState): void {
  const filePath = getStateFilePath(workspace);
  const dirPath = path.dirname(filePath);
  fs.mkdirSync(dirPath, { recursive: true });

  const validated = PlannerStateSchema.parse(state);
  fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), "utf-8");
}
