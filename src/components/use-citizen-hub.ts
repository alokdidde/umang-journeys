"use client";

import { useCallback, useEffect, useState } from "react";
import type { CitizenHubSnapshot } from "@/domain/citizen-hub";

const emptySnapshot: CitizenHubSnapshot = {
  documents: [],
  activity: [],
  tasks: [],
  summary: { uploaded: 0, issued: 0, needsReview: 0, activity: 0, tasks: 0 },
};

export function useCitizenHub() {
  const [snapshot, setSnapshot] = useState<CitizenHubSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/hub");
    const body = await response.json() as CitizenHubSnapshot & { message?: string };
    if (!response.ok) throw new Error(body.message ?? "Your account history could not be loaded.");
    setSnapshot(body);
    setError(null);
    return body;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/hub", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as CitizenHubSnapshot & { message?: string };
        if (!response.ok) throw new Error(body.message ?? "Your account history could not be loaded.");
        setSnapshot(body);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Your account history could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { snapshot, loading, error, refresh };
}
