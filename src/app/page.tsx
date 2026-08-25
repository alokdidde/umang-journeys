"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, CheckCircle2, Files, LoaderCircle, Plus, Route, Sparkles } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { lifeEvents } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import { JourneyCard } from "@/components/journey-card";
import { JourneyStarterComposer } from "@/components/journey-starter-composer";

type JourneyListResponse = { journeys: JourneySummary[] };

export default function HomePage() {
  const { state, dispatch } = useJourney();
  const [query, setQuery] = useState(state.statement);
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/journeys", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as JourneyListResponse & { message?: string };
        if (!response.ok) throw new Error(body.message ?? "Your journeys could not be loaded.");
        setJourneys(body.journeys);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Your journeys could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function start(statement?: string) {
    dispatch({ type: "set_statement", value: (statement ?? query.trim()) || state.statement });
    router.push("/intake");
  }

  if (loading) {
    return <main className="page workflow-state"><LoaderCircle className="service-spinner" /><p>Loading your journeys…</p></main>;
  }

  return journeys.length > 0
    ? <ReturningHome journeys={journeys} start={start} loadError={loadError} />
    : <FirstVisitHome query={query} setQuery={setQuery} start={start} loadError={loadError} />;
}

function ReturningHome({ journeys, start, loadError }: { journeys: JourneySummary[]; start: (statement?: string) => void; loadError: string | null }) {
  const activeJourney = journeys.find((journey) => journey.status !== "completed");
  const completedCount = journeys.filter((journey) => journey.status === "completed").length;
  return (
    <main className="page returning-home">
      <ScenicBackdrop />
      <section className="dashboard-intro content-layer">
        <div><p className="eyebrow"><Sparkles size={15} />Welcome back</p><h1>{activeJourney ? "Continue where you left off" : "Your journeys are up to date"}</h1><p>{activeJourney ? "Your next unfinished step is ready below." : "Start another journey or review your completed records."}</p></div>
      </section>
      {loadError && <p className="workflow-error content-layer" role="alert">{loadError}</p>}

      <section className="home-next-step content-layer" aria-labelledby="active-journeys-heading">
        {activeJourney ? <>
          <div className="dashboard-section-heading"><div><span>What to do now</span><h2 id="active-journeys-heading">Next for you</h2></div></div>
          <JourneyCard journey={activeJourney} />
        </> : <div className="all-caught-up panel">
          <span><CheckCircle2 /></span>
          <div><p>You’re all caught up</p><h2 id="active-journeys-heading">Nothing needs your attention.</h2><small>Your completed journeys and records are still saved.</small></div>
          <Link href="/journeys#completed-journeys">View completed journeys<ArrowRight /></Link>
        </div>}
      </section>

      <section className="home-shortcuts content-layer" aria-label="More things you can do">
        <Link href="/journeys"><Route /><span><strong>My journeys</strong><small>{completedCount ? `${completedCount} completed · see every journey` : "See every step"}</small></span><ArrowRight /></Link>
        <Link href="/documents"><Files /><span><strong>Add a document</strong><small>We’ll work out where it belongs</small></span><ArrowRight /></Link>
        <Link href="/activity"><Activity /><span><strong>Recent activity</strong><small>See what changed</small></span><ArrowRight /></Link>
      </section>

      <details className="journey-starter content-layer">
        <summary><span><Plus />Start another journey</span><small>Your current journey will stay saved.</small></summary>
        <LifeEventGrid start={start} returning />
      </details>
      <TrustNote>Your journeys are saved to this evaluation account using synthetic data.</TrustNote>
    </main>
  );
}

function FirstVisitHome({ query, setQuery, start, loadError }: { query: string; setQuery: (value: string) => void; start: (statement?: string) => void; loadError: string | null }) {
  return (
    <main className="page home-page">
      <ScenicBackdrop />
      <section className="hero content-layer">
        <div className="eyebrow"><Sparkles size={16} /> Citizen services, reorganised around you</div>
        <h1>What do you need help with?</h1>
        <p>Describe a life event, and we’ll show the government services and steps that apply.</p>
        <JourneyStarterComposer query={query} setQuery={setQuery} start={start} />
        {loadError && <p className="workflow-error" role="alert">{loadError}</p>}
      </section>
      <p className="event-grid-label content-layer">Or choose a life event</p>
      <LifeEventGrid start={start} />
      <TrustNote>Choose one event. We’ll ask only what is needed for the next step.</TrustNote>
    </main>
  );
}

function LifeEventGrid({ start, returning = false }: { start: (statement?: string) => void; returning?: boolean }) {
  return <section className={`event-grid content-layer ${returning ? "compact-event-grid" : ""}`} aria-label="Life events">
    {lifeEvents.map(({ key, label, Icon, active, tone }) => (
      <button key={key} className={`event-card ${active ? "available" : ""}`} onClick={active ? () => start(key === "vehicle" ? "I bought a used Tata Nexon in Hyderabad." : key === "health" ? "I want to understand my health insurance and prepare for cashless care in Hyderabad." : key === "home" ? "We are moving to a rented home in Hyderabad next month." : key === "business" ? "I am starting a design business from a rented office in Hyderabad." : key === "retirement" ? "I retire from private employment next month and have an EPFO account." : "We had a baby yesterday at Apollo Hospital in Hyderabad.") : undefined} type="button" aria-disabled={!active}>
        {active && returning ? <span className="selected-badge"><Plus size={15} /></span> : null}
        {!active && <span className="preview-badge">Preview</span>}
        <span className={`event-icon ${tone}`}><Icon /></span><strong>{returning && active ? `Another: ${label}` : label}</strong>
      </button>
    ))}
  </section>;
}
