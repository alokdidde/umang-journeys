"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Baby, Check, Files, LoaderCircle, Mic, Plus, Route, Search, Sparkles } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { lifeEvents } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import { JourneyCard } from "@/components/journey-card";

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
  return (
    <main className="page returning-home">
      <ScenicBackdrop />
      <section className="dashboard-intro content-layer">
        <div><p className="eyebrow"><Sparkles size={15} />Welcome back</p><h1>One thing at a time.</h1><p>We’ll show you the most useful next step first.</p></div>
      </section>
      {loadError && <p className="workflow-error content-layer" role="alert">{loadError}</p>}

      <section className="home-next-step content-layer" aria-labelledby="active-journeys-heading">
        <div className="dashboard-section-heading"><div><span>What to do now</span><h2 id="active-journeys-heading">Next for you</h2></div></div>
        <JourneyCard journey={journeys[0]} />
      </section>

      <section className="home-shortcuts content-layer" aria-label="More things you can do">
        <Link href="/journeys"><Route /><span><strong>My journeys</strong><small>See every step</small></span><ArrowRight /></Link>
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
