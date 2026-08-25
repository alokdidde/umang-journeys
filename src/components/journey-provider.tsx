"use client";

import { createContext, useContext, useEffect, type Dispatch, type ReactNode } from "react";
import { useEffectReducer } from "use-effect-reducer";
import { appReducer, pristineState, type AppAction, type AppState } from "@/domain/app-state";

const STORAGE_KEY = "umang-journeys:demo:v1";
const JourneyContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useEffectReducer((current: AppState, action: AppAction) => appReducer(current, action), pristineState);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      dispatch({ type: "hydrate", state: saved ? (JSON.parse(saved) as Partial<AppState>) : undefined });
    } catch {
      dispatch({ type: "hydrate" });
    }
  }, [dispatch]);

  useEffect(() => {
    if (state.hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <JourneyContext.Provider value={{ state, dispatch }}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error("useJourney must be used inside JourneyProvider");
  return context;
}
