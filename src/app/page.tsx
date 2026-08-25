"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Baby, Check, Files, LoaderCircle, Mic, Plus, Route, Search, Sparkles } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { lifeEvents } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import { DocumentDesk } from "@/components/document-desk";
import { JourneyCard } from "@/components/journey-card";
import { useCitizenHub } from "@/components/use-citizen-hub";

type JourneyListResponse = { journeys: JourneySummary[] };

export default function HomePage() {
  const { state, dispatch } = useJourney();
  const [query, setQuery] = useState(state.statement);
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();

  const refreshJourneys = useCallback(async () => {
    const response = await fetch("/api/journeys");
    const body = await response.json() as JourneyListResponse & { message?: string };
    if (!response.ok) throw new Error(body.message ?? "Your journeys could not be loaded.");
    setJourneys(body.journeys);
    setLoadError(null);
  }, []);

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
    ? <ReturningHome journeys={journeys} start={start} loadError={loadError} refreshJourneys={refreshJourneys} />
    : <FirstVisitHome query={query} setQuery={setQuery} start={start} loadError={loadError} />;
}

function ReturningHome({ journeys, start, loadError, refreshJourneys }: { journeys: JourneySummary[]; start: (statement?: string) => void; loadError: string | null; refreshJourneys: () => Promise<void> }) {
  const { snapshot, refresh: refreshHub } = useCitizenHub();
  async function refreshAccount() { await Promise.all([refreshJourneys(), refreshHub()]); }
  return (
    <main className="page returning-home">
      <ScenicBackdrop />
      <section className="dashboard-intro content-layer">
        <div><p className="eyebrow"><Sparkles size={15} />Your UMANG journeys</p><h1>Welcome back, Ananya.</h1><p>Here’s what needs your attention next.</p></div>
        <button className="secondary-button" type="button" onClick={() => start()}><Plus />Start another journey</button>
      </section>
      {loadError && <p className="workflow-error content-layer" role="alert">{loadError}</p>}

      <section className="account-overview content-layer" aria-label="Account overview">
        <Link href="/journeys"><span><Route /></span><strong>{journeys.length}</strong><small>{journeys.length === 1 ? "Active journey" : "Journeys"}</small><ArrowRight /></Link>
        <Link href="/documents"><span><Files /></span><strong>{snapshot.documents.length}</strong><small>Documents and records</small><ArrowRight /></Link>
        <Link href="/activity"><span><Activity /></span><strong>{snapshot.summary.activity}</strong><small>Activity entries</small><ArrowRight /></Link>
      </section>

      <DocumentDesk onJourneyChanged={refreshAccount} />

      <section className="active-journeys content-layer" aria-labelledby="active-journeys-heading">
        <div className="dashboard-section-heading"><div><span>Continue where you left off</span><h2 id="active-journeys-heading">Next up</h2></div><Link href="/journeys">View all journeys<ArrowRight /></Link></div>
        <div className="journey-card-grid">{journeys.slice(0, 2).map((journey) => <JourneyCard journey={journey} key={journey.id} />)}</div>
      </section>

      <section className="explore-journeys content-layer" aria-labelledby="explore-heading">
        <div className="dashboard-section-heading"><div><span>Life keeps moving</span><h2 id="explore-heading">Start something new</h2></div><p>Your current journeys stay exactly where they are.</p></div>
        <LifeEventGrid start={start} returning />
      </section>
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
        <h1>Life happens. We guide you.</h1>
        <p>Tell us what happened in your life. We’ll assemble the right government journey around you.</p>
        <form className="life-search" onSubmit={(event) => { event.preventDefault(); start(); }}>
          <Search aria-hidden="true" />
          <input aria-label="Describe your life event" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="I had a baby, we moved home, I bought a vehicle…" />
          <span className="mic-muted" title="Voice input is coming later"><Mic /></span>
        </form>
        {loadError && <p className="workflow-error" role="alert">{loadError}</p>}
      </section>
      <LifeEventGrid start={start} />
      <section className="how-it-works content-layer">
        <div className="section-rule"><span>How it works</span></div>
        <div className="steps-row">
          <article><span>1</span><div><strong>Tell us the life event</strong><p>In your own words—type it naturally.</p></div></article><ArrowRight />
          <article><span>2</span><div><strong>Review what’s known</strong><p>Confirm facts from your statement and records.</p></div></article><ArrowRight />
          <article><span>3</span><div><strong>Follow one journey</strong><p>See exactly what to do, step by step.</p></div></article>
        </div>
      </section>
      <div className="primary-cta-wrap content-layer"><button className="primary-cta" onClick={() => start()} type="button"><span className="cta-baby"><Baby /></span>Start New Baby Journey<ArrowRight /></button><TrustNote /></div>
    </main>
  );
}

function LifeEventGrid({ start, returning = false }: { start: (statement?: string) => void; returning?: boolean }) {
  return <section className={`event-grid content-layer ${returning ? "compact-event-grid" : ""}`} aria-label="Life events">
    {lifeEvents.map(({ key, label, Icon, active, tone }) => (
      <button key={key} className={`event-card ${active ? "active" : ""}`} onClick={active ? () => start(key === "vehicle" ? "I bought a used Tata Nexon in Hyderabad." : "We had a baby yesterday at Apollo Hospital in Hyderabad.") : undefined} type="button" aria-disabled={!active}>
        {active && <span className="selected-badge">{returning ? <Plus size={15} /> : <Check size={15} />}</span>}
        {!active && <span className="preview-badge">Preview</span>}
        <span className={`event-icon ${tone}`}><Icon /></span><strong>{returning && active ? `Another: ${label}` : label}</strong>
      </button>
    ))}
  </section>;
}
