import type { IntakeResult } from "./intake-analysis";

export type IntakeResolutionState = {
  phase: "idle" | "analysing" | "ready" | "error";
  resolution: IntakeResult | null;
  analysedStatement: string | null;
  error: string | null;
};

export type IntakeResolutionAction =
  | { type: "analysis_requested" }
  | { type: "edit_requested" }
  | { type: "resolution_succeeded"; resolution: IntakeResult; statement: string }
  | { type: "resolution_failed"; message: string }
  | { type: "retry_requested" };

export const initialIntakeResolutionState: IntakeResolutionState = {
  phase: "idle",
  resolution: null,
  analysedStatement: null,
  error: null,
};

export function intakeResolutionReducer(state: IntakeResolutionState, action: IntakeResolutionAction): IntakeResolutionState {
  if (action.type === "analysis_requested") return { ...initialIntakeResolutionState, phase: "analysing" };
  if (action.type === "edit_requested") return initialIntakeResolutionState;
  if (action.type === "resolution_succeeded") return { phase: "ready", resolution: action.resolution, analysedStatement: action.statement, error: null };
  if (action.type === "resolution_failed") return { phase: "error", resolution: null, analysedStatement: null, error: action.message };
  if (action.type === "retry_requested") return { ...initialIntakeResolutionState, phase: "analysing" };
  return state;
}
