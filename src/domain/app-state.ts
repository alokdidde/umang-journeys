import { compileJourney, newBabyTemplate, type JourneyProjection } from "./journey-engine";
import type { SandboxServiceRun } from "./service-workflows";
import type { JourneyEvidence } from "./evidence";
import type { JourneySubject } from "./journey-summary";

export type RegistrationForm = { childName: string; localWard: string };
export type FormErrors = Partial<Record<keyof RegistrationForm, string>>;

export type AppState = {
  hydrated: boolean;
  journeyId: string | null;
  subject: JourneySubject | null;
  pending: boolean;
  error: string | null;
  statement: string;
  hospitalRegistered: "yes" | "not_sure" | "no" | null;
  vehicleOwnershipTransferred: "yes" | "not_sure" | "no" | null;
  healthCoverageKnown: "yes" | "not_sure" | "no" | null;
  moveAddressEvidenceKnown: "yes" | "not_sure" | "no" | null;
  businessPremisesProofKnown: "yes" | "not_sure" | "no" | null;
  retirementStatementKnown: "yes" | "not_sure" | "no" | null;
  projection: JourneyProjection;
  form: RegistrationForm;
  facts: Record<string, string>;
  serviceRuns: Record<string, SandboxServiceRun | undefined>;
  evidence: JourneyEvidence[];
  formErrors: FormErrors;
  registrationId: string | null;
};

export type ServerJourney = {
  id: string;
  subject: JourneySubject;
  projection: JourneyProjection;
  facts: Record<string, string>;
  serviceRuns?: Record<string, SandboxServiceRun | undefined>;
  evidence?: JourneyEvidence[];
  registrationId?: string;
};

export type AppAction =
  | { type: "hydrate"; state?: Partial<AppState> }
  | { type: "set_statement"; value: string }
  | { type: "set_hospital_registered"; value: "yes" | "not_sure" | "no" }
  | { type: "set_vehicle_ownership_transferred"; value: "yes" | "not_sure" | "no" }
  | { type: "set_health_coverage_known"; value: "yes" | "not_sure" | "no" }
  | { type: "set_move_address_evidence_known"; value: "yes" | "not_sure" | "no" }
  | { type: "set_business_premises_proof_known"; value: "yes" | "not_sure" | "no" }
  | { type: "set_retirement_statement_known"; value: "yes" | "not_sure" | "no" }
  | { type: "set_field"; field: keyof RegistrationForm; value: string }
  | { type: "submit_registration" }
  | { type: "server_journey_loaded"; journey: ServerJourney }
  | { type: "operation_started" }
  | { type: "operation_failed"; message: string }
  | { type: "reset" };

export const pristineState: AppState = {
  hydrated: false,
  journeyId: null,
  subject: null,
  pending: false,
  error: null,
  statement: "",
  hospitalRegistered: null,
  vehicleOwnershipTransferred: null,
  healthCoverageKnown: null,
  moveAddressEvidenceKnown: null,
  businessPremisesProofKnown: null,
  retirementStatementKnown: null,
  projection: compileJourney(newBabyTemplate),
  form: { childName: "", localWard: "" },
  facts: {},
  serviceRuns: {},
  evidence: [],
  formErrors: {},
  registrationId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "hydrate":
      return { ...pristineState, ...action.state, hydrated: true };
    case "set_statement":
      return {
        ...state,
        statement: action.value,
        hospitalRegistered: null,
        vehicleOwnershipTransferred: null,
        healthCoverageKnown: null,
        moveAddressEvidenceKnown: null,
        businessPremisesProofKnown: null,
        retirementStatementKnown: null,
        error: null,
      };
    case "set_hospital_registered":
      return { ...state, hospitalRegistered: action.value };
    case "set_vehicle_ownership_transferred":
      return { ...state, vehicleOwnershipTransferred: action.value };
    case "set_health_coverage_known":
      return { ...state, healthCoverageKnown: action.value };
    case "set_move_address_evidence_known":
      return { ...state, moveAddressEvidenceKnown: action.value };
    case "set_business_premises_proof_known":
      return { ...state, businessPremisesProofKnown: action.value };
    case "set_retirement_statement_known":
      return { ...state, retirementStatementKnown: action.value };
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
      };
    }
    case "server_journey_loaded":
      return {
        ...state,
        hydrated: true,
        pending: false,
        error: null,
        journeyId: action.journey.id,
        subject: action.journey.subject,
        projection: action.journey.projection,
        facts: action.journey.facts,
        serviceRuns: action.journey.serviceRuns ?? {},
        evidence: action.journey.evidence ?? [],
        form: {
          childName: action.journey.facts["child.name"] ?? state.form.childName,
          localWard: action.journey.facts["birth.place.ward"] ?? state.form.localWard,
        },
        registrationId: action.journey.registrationId ?? null,
      };
    case "operation_started":
      return { ...state, pending: true, error: null };
    case "operation_failed":
      return { ...state, pending: false, error: action.message };
    case "reset":
      return { ...pristineState, hydrated: true };
  }
}
