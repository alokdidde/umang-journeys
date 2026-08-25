import { compileJourney, completeNode, newBabyTemplate, type JourneyProjection } from "./journey-engine";

export type RegistrationForm = { childName: string; localWard: string };
export type FormErrors = Partial<Record<keyof RegistrationForm, string>>;

export type AppState = {
  hydrated: boolean;
  statement: string;
  hospitalRegistered: "yes" | "not_sure" | "no" | null;
  projection: JourneyProjection;
  form: RegistrationForm;
  formErrors: FormErrors;
  registrationId: string | null;
};

export type AppAction =
  | { type: "hydrate"; state?: Partial<AppState> }
  | { type: "set_statement"; value: string }
  | { type: "set_hospital_registered"; value: "yes" | "not_sure" | "no" }
  | { type: "set_field"; field: keyof RegistrationForm; value: string }
  | { type: "submit_registration" }
  | { type: "reset" };

export const goldenStatement = "We had a baby yesterday at Apollo Hospital in Hyderabad.";

export const pristineState: AppState = {
  hydrated: false,
  statement: goldenStatement,
  hospitalRegistered: null,
  projection: compileJourney(newBabyTemplate),
  form: { childName: "", localWard: "" },
  formErrors: {},
  registrationId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "hydrate":
      return { ...pristineState, ...action.state, hydrated: true };
    case "set_statement":
      return { ...state, statement: action.value };
    case "set_hospital_registered":
      return { ...state, hospitalRegistered: action.value };
    case "set_field":
      return {
        ...state,
        form: { ...state.form, [action.field]: action.value },
        formErrors: { ...state.formErrors, [action.field]: undefined },
      };
    case "submit_registration": {
      const formErrors: FormErrors = {};
      if (!state.form.childName.trim()) formErrors.childName = "Enter the child's name";
      if (!state.form.localWard.trim()) formErrors.localWard = "Select a ward or area";
      if (Object.keys(formErrors).length) return { ...state, formErrors };
      return {
        ...state,
        formErrors: {},
        registrationId: "BR-DEMO-2026-7429",
        projection: completeNode(state.projection, "birth_registration"),
      };
    }
    case "reset":
      return { ...pristineState, hydrated: true };
  }
}
