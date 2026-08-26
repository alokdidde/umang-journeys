"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Car, CheckCircle2, LoaderCircle, Plus, Route, ShieldPlus, Users } from "lucide-react";
import { JourneyCard } from "@/components/journey-card";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import type { IntakeJourneyKey } from "@/domain/intake-experience";

export default function JourneysPage() {
  const { dispatch } = useJourney();
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
  function start(journey?: IntakeJourneyKey) {
    dispatch({ type: "set_statement", value: "" });
    router.push(journey ? `/intake?journey=${journey}` : "/intake");
  }
  const activeJourneys = journeys.filter((journey) => journey.status !== "completed");
  const completedJourneys = journeys.filter((journey) => journey.status === "completed");
  const householdGroups = [...new Map(journeys.filter((journey) => journey.subject.householdId && (journey.subject.type === "person" || journey.subject.type === "child")).map((journey) => [journey.subject.householdId!, journeys.filter((candidate) => candidate.subject.householdId === journey.subject.householdId && (candidate.subject.type === "person" || candidate.subject.type === "child"))])).values()].filter((group) => group.length > 1);
  return <main className="page hub-page journeys-index-page">
    <header className="hub-page-header content-layer"><div><p className="eyebrow"><Route />Journeys</p><h1>Your journeys</h1><p>Pick up where you left off.</p></div><button className="secondary-button" type="button" onClick={() => start()}><Plus />Start another</button></header>
    {error ? <p className="workflow-error content-layer" role="alert">{error}</p> : null}
    {!loading && householdGroups.map((group) => <section className="household-journey-group content-layer" key={group[0]?.subject.householdId}><Users aria-hidden="true" /><div><strong>Family journeys stay separate</strong><p>{group.map((journey) => journey.subject.displayName).join(" · ")}</p></div><small>Each person keeps their own evidence, decisions and progress.</small></section>)}
    {loading ? <div className="collection-state content-layer" role="status"><LoaderCircle className="service-spinner" /><p>Loading your journeys…</p></div> : journeys.length ? <>
      <section className="journey-collection content-layer" aria-labelledby="active-journeys-title">
        <header><div><h2 id="active-journeys-title">In progress</h2><p>Journeys that still have something to do.</p></div><span>{activeJourneys.length}</span></header>
        {activeJourneys.length ? <div className="journey-card-grid">{activeJourneys.map((journey) => <JourneyCard journey={journey} key={journey.id} />)}</div> : <div className="journey-section-empty"><CheckCircle2 /><div><strong>Nothing needs your attention</strong><p>Your next journey will appear here when you start one.</p></div></div>}
      </section>
      {completedJourneys.length ? <section id="completed-journeys" className="journey-collection completed-journeys content-layer" aria-labelledby="completed-journeys-title">
        <header><div><h2 id="completed-journeys-title">Completed journeys</h2><p>Open a journey whenever you need its records or documents.</p></div><span>{completedJourneys.length}</span></header>
        <div className="journey-card-grid">{completedJourneys.map((journey) => <JourneyCard journey={journey} key={journey.id} />)}</div>
      </section> : null}
    </> : <section className="collection-state panel content-layer"><Route /><h2>No journeys yet</h2><p>Start with a life event and the app will assemble the relevant service plan.</p><div><button type="button" className="primary-cta" onClick={() => start("baby")}><Baby />Start a baby journey</button><button type="button" className="secondary-button" onClick={() => start("vehicle")}><Car />Start a vehicle journey</button><button type="button" className="secondary-button" onClick={() => start("health")}><ShieldPlus />Start health &amp; insurance</button></div></section>}
  </main>;
}
