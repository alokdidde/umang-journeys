"use client";

import { createContext, useCallback, useContext, useEffect, type Dispatch, type ReactNode } from "react";
import { useEffectReducer } from "use-effect-reducer";
import { appReducer, pristineState, type AppAction, type AppState, type ServerJourney } from "@/domain/app-state";

type JourneyContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  createJourney: (facts: Record<string, string>) => Promise<string | null>;
  loadJourney: (id: string) => Promise<boolean>;
  submitRegistration: (id: string) => Promise<boolean>;
  advanceService: (id: string, nodeKey: string) => Promise<boolean>;
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
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Journey could not be loaded." });
      return false;
    }
  }, [dispatch]);

  const createJourney = useCallback(async (facts: Record<string, string>) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>("/api/journeys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facts }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return journey.id;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Journey could not be created." });
      return null;
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

  const advanceService = useCallback(async (id: string, nodeKey: string) => {
    dispatch({ type: "operation_started" });
    try {
      const journey = await requestJson<ServerJourney>(`/api/journeys/${encodeURIComponent(id)}/nodes/${encodeURIComponent(nodeKey)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      dispatch({ type: "server_journey_loaded", journey });
      return true;
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "The sandbox service could not complete this request." });
      return false;
    }
  }, [dispatch]);

  return <JourneyContext.Provider value={{ state, dispatch, createJourney, loadJourney, submitRegistration, advanceService, resetJourney }}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error("useJourney must be used inside JourneyProvider");
  return context;
}
