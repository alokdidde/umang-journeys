import type { LifeRequestPlan } from "./life-request";

export type LifeRequestPhase = "idle" | "analysing" | "details" | "proposal" | "applying" | "error";
export type LifeRequestState = { phase: LifeRequestPhase; plan: LifeRequestPlan | null; answers: Record<string, string>; error: string | null };

export const initialLifeRequestState: LifeRequestState = { phase: "idle", plan: null, answers: {}, error: null };

export type LifeRequestAction =
  | { type: "analyse" }
  | { type: "planned"; plan: LifeRequestPlan }
  | { type: "answer"; id: string; value: string }
  | { type: "review" }
  | { type: "edit" }
  | { type: "apply" }
  | { type: "fail"; message: string }
  | { type: "reset" };

export function lifeRequestReducer(state: LifeRequestState, action: LifeRequestAction): LifeRequestState {
  if (action.type === "analyse") return { ...initialLifeRequestState, phase: "analysing" };
  if (action.type === "planned") return { phase: action.plan.questions.length ? "details" : "proposal", plan: action.plan, answers: {}, error: null };
  if (action.type === "answer") return { ...state, answers: { ...state.answers, [action.id]: action.value }, error: null };
  if (action.type === "review") return { ...state, phase: "proposal", error: null };
  if (action.type === "edit") return { ...state, phase: state.plan?.questions.length ? "details" : "idle", error: null };
  if (action.type === "apply") return { ...state, phase: "applying", error: null };
  if (action.type === "fail") return { ...state, phase: "error", error: action.message };
  return initialLifeRequestState;
}
