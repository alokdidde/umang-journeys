import type { DocumentAnalysis, DocumentProposal } from "./document-intake";

export type DocumentDeskRecord = {
  id: string;
  status: "proposed" | "applied" | "rejected";
  fileName: string;
  mimeType: string;
  size: number;
  source: "sample" | "user_upload";
  analysis: DocumentAnalysis;
  proposal: DocumentProposal;
  appliedJourneyId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDeskState = {
  phase: "idle" | "analysing" | "proposal" | "applying" | "success" | "error";
  document: DocumentDeskRecord | null;
  message: string | null;
  journeyId: string | null;
  error: string | null;
};

export type DocumentDeskAction =
  | { type: "analysis_started" }
  | { type: "proposal_received"; document: DocumentDeskRecord }
  | { type: "application_started" }
  | { type: "application_finished"; journeyId: string | null; message: string }
  | { type: "dismissed"; message: string }
  | { type: "failed"; message: string }
  | { type: "reset" };

export const initialDocumentDeskState: DocumentDeskState = {
  phase: "idle",
  document: null,
  message: null,
  journeyId: null,
  error: null,
};

export function documentDeskReducer(state: DocumentDeskState, action: DocumentDeskAction): DocumentDeskState {
  switch (action.type) {
    case "analysis_started":
      return { ...initialDocumentDeskState, phase: "analysing" };
    case "proposal_received":
      return { ...state, phase: "proposal", document: action.document, error: null };
    case "application_started":
      return { ...state, phase: "applying", error: null };
    case "application_finished":
      return { ...state, phase: "success", journeyId: action.journeyId, message: action.message, error: null };
    case "dismissed":
      return { ...state, phase: "success", journeyId: null, message: action.message, error: null };
    case "failed":
      return { ...state, phase: "error", error: action.message };
    case "reset":
      return initialDocumentDeskState;
  }
}
