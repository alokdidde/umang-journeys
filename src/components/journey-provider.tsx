"use client";

import { createContext, useCallback, useContext, useEffect, type Dispatch, type ReactNode } from "react";
import { useEffectReducer } from "use-effect-reducer";
import { appReducer, pristineState, type AppAction, type AppState, type ServerJourney } from "@/domain/app-state";
import type { EvidenceType } from "@/domain/evidence";

type JourneyContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  createJourney: (facts: Record<string, string>, templateId?: string) => Promise<string | null>;
  loadJourney: (id: string) => Promise<boolean>;
  submitRegistration: (id: string) => Promise<boolean>;
  advanceService: (id: string, nodeKey: string, input?: { intent?: "submit" | "clarify" | "appeal" | "check_status"; message?: string; consent?: true }) => Promise<boolean>;
  completeVehicleDetails: (id: string, facts: Record<string, string>) => Promise<boolean>;
  completeHealthProfile: (id: string, facts: Record<string, string>) => Promise<boolean>;
  completeProfileStep: (id: string, nodeKey: "move_profile" | "business_profile" | "retirement_profile", facts: Record<string, string>) => Promise<boolean>;
  updateJourneyFacts: (id: string, facts: Record<string, string>) => Promise<boolean>;
  activateBranch: (id: string, branchKey: string) => Promise<boolean>;
  addEvidence: (id: string, type: EvidenceType, file?: File) => Promise<boolean>;
  reviewEvidence: (id: string, evidenceId: string, approved: boolean, fields?: Record<string, string>) => Promise<boolean>;
  resetJourney: () => Promise<void>;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message ?? "The service could not complete this request.");
  return body;
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useEffectReducer((current: AppState, action: AppAction) => appReducer(current, action), pristineState);

  useEffect(() => dispatch({ type: "hydrate" }), [dispatch]);

  const loadJourney = useCallback(async (id: string) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}`);
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "This record could not be loaded." });
      return false;
    }
  }, [dispatch]);

  const createJourney = useCallback(async (facts: Record<string, string>, templateId = "new-baby.india.v1") => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>("/api/journeys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facts, templateId }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return journey.id;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "This could not be added to My life." });
      return null;
    }
  }, [dispatch]);

  const updateJourneyFacts = useCallback(async (id: string, facts: Record<string, string>) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/facts`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facts }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "These details could not be saved." });
      return false;
    }
  }, [dispatch]);

  const activateBranch = useCallback(async (id: string, branchKey: string) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/branches/${encodeURIComponent(branchKey)}`, { method: "POST" });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "These optional steps could not be added." });
      return false;
    }
  }, [dispatch]);

  const completeVehicleDetails = useCallback(async (id: string, facts: Record<string, string>) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/nodes/vehicle_details/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...facts, idempotencyKey: crypto.randomUUID() }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Vehicle details could not be confirmed." });
      return false;
    }
  }, [dispatch]);

  const completeHealthProfile = useCallback(async (id: string, facts: Record<string, string>) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/nodes/health_profile/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...facts, idempotencyKey: crypto.randomUUID() }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Health profile could not be confirmed." });
      return false;
    }
  }, [dispatch]);

  const completeProfileStep = useCallback(async (id: string, nodeKey: "move_profile" | "business_profile" | "retirement_profile", facts: Record<string, string>) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/nodes/${nodeKey}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...facts, idempotencyKey: crypto.randomUUID() }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "These details could not be confirmed." });
      return false;
    }
  }, [dispatch]);

  const addEvidence = useCallback(async (id: string, type: EvidenceType, file?: File) => {
    dispatch({ type: "operation_started" });
    try {
      let init: RequestInit;
      if (file) {
        const form = new FormData();
        form.set("type", type);
        form.set("file", file);
        init = { method: "POST", body: form };
      } else {
        init = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, sample: true }) };
      }
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/evidence`, init);
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Evidence could not be added." });
      return false;
    }
  }, [dispatch]);

  const reviewEvidence = useCallback(async (id: string, evidenceId: string, approved: boolean, fields?: Record<string, string>) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved, fields }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Evidence review could not be saved." });
      return false;
    }
  }, [dispatch]);

  const submitRegistration = useCallback(async (id: string) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/nodes/birth_registration/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          childName: state.form.childName,
          localWard: state.form.localWard,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Registration could not be completed." });
      return false;
    }
  }, [dispatch, state.form.childName, state.form.localWard]);

  const resetJourney = useCallback(async () => {
    try {
      await requestJson("/api/demo/reset", { method: "POST" });
    } finally {
      dispatch({ type: "reset" });
    }
  }, [dispatch]);

  const advanceService = useCallback(async (id: string, nodeKey: string, input: { intent?: "submit" | "clarify" | "appeal" | "check_status"; message?: string; consent?: true } = {}) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/nodes/${encodeURIComponent(nodeKey)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...input }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "The synthetic agency could not review this request." });
      return false;
    }
  }, [dispatch]);

  return <JourneyContext.Provider value={{ state, dispatch, createJourney, loadJourney, submitRegistration, advanceService, completeVehicleDetails, completeHealthProfile, completeProfileStep, updateJourneyFacts, activateBranch, addEvidence, reviewEvidence, resetJourney }}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error("useJourney must be used inside JourneyProvider");
  return context;
}
