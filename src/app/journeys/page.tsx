"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Car, LoaderCircle, Plus, Route } from "lucide-react";
import { JourneyCard } from "@/components/journey-card";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";

export default function JourneysPage() {
  const { state, dispatch } = useJourney();
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/journeys", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { journeys: JourneySummary[]; message?: string };
        if (!response.ok) throw new Error(body.message ?? "Your journeys could not be loaded.");
        setJourneys(body.journeys);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Your journeys could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  function start(statement: string) { dispatch({ type: "set_statement", value: statement || state.statement }); router.push("/intake"); }
  return <main className="page hub-page journeys-index-page">
    <header className="hub-page-header content-layer"><div><p className="eyebrow"><Route />Journey workspace</p><h1>Your journeys</h1><p>Continue the next required task or open a journey to review every completed and upcoming service.</p></div><button className="secondary-button" type="button" onClick={() => start("")}><Plus />Start another journey</button></header>
    {error ? <p className="workflow-error content-layer" role="alert">{error}</p> : null}
    {loading ? <div className="collection-state content-layer" role="status"><LoaderCircle className="service-spinner" /><p>Loading your journeys…</p></div> : journeys.length ? <section className="journey-card-grid content-layer" aria-label="Your journeys">{journeys.map((journey) => <JourneyCard journey={journey} key={journey.id} />)}</section> : <section className="collection-state panel content-layer"><Route /><h2>No journeys yet</h2><p>Start with a life event and the app will assemble the relevant service plan.</p><div><button type="button" className="primary-cta" onClick={() => start("We had a baby yesterday at Apollo Hospital in Hyderabad.")}><Baby />Start a baby journey</button><button type="button" className="secondary-button" onClick={() => start("I bought a used Tata Nexon in Hyderabad.")}><Car />Start a vehicle journey</button></div></section>}
  </main>;
}
