"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Baby, Car, Check, Clock3, CreditCard, FileText, Gift, HeartPulse, IdCard, LoaderCircle, Mic, Plus, Search, ShieldCheck, Sparkles, Syringe } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { lifeEvents } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import { DocumentDesk } from "@/components/document-desk";

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
  return (
    <main className="page returning-home">
      <ScenicBackdrop />
      <section className="dashboard-intro content-layer">
        <div><p className="eyebrow"><Sparkles size={15} />Your UMANG journeys</p><h1>Welcome back, Ananya.</h1><p>Here’s what needs your attention next.</p></div>
        <button className="secondary-button" type="button" onClick={() => start()}><Plus />Start another journey</button>
      </section>
      {loadError && <p className="workflow-error content-layer" role="alert">{loadError}</p>}

      <DocumentDesk onJourneyChanged={refreshJourneys} />

      <section className="active-journeys content-layer" aria-labelledby="active-journeys-heading">
        <div className="dashboard-section-heading"><div><span>Continue where you left off</span><h2 id="active-journeys-heading">Your {journeys.length === 1 ? "active journey" : "journeys"}</h2></div><small>{journeys.length} {journeys.length === 1 ? "journey" : "journeys"}</small></div>
        <div className="journey-card-grid">{journeys.map((journey) => <JourneyCard journey={journey} key={journey.id} />)}</div>
      </section>

      <section className="explore-journeys content-layer" aria-labelledby="explore-heading">
        <div className="dashboard-section-heading"><div><span>Life keeps moving</span><h2 id="explore-heading">Start something new</h2></div><p>Your current journeys stay exactly where they are.</p></div>
        <LifeEventGrid start={start} returning />
      </section>
      <TrustNote>Your journeys are saved to this evaluation account using synthetic data.</TrustNote>
    </main>
  );
}

function JourneyCard({ journey }: { journey: JourneySummary }) {
  const action = journey.nextAction;
  return (
    <article className="home-journey-card panel">
      <header>
        <span className={`journey-avatar ${journey.subject.type}`}>
          {journey.subject.type === "vehicle" ? <Car /> : <Baby />}
        </span>
        <div><p>{journey.title}</p><h3>{journey.subject.displayName}</h3><span><Clock3 />Updated {formatUpdatedAt(journey.updatedAt)}</span></div>
        <em className={`status ${journey.status === "completed" ? "completed" : "in_progress"}`}>{journey.status === "completed" ? "Journey complete" : "Active journey"}</em>
      </header>
      <div className="home-progress-copy"><span>{journey.progress.completed} of {journey.progress.total} services complete</span><strong>{journey.progress.percent}%</strong></div>
      <div className="home-progress-track" role="progressbar" aria-label={`${journey.subject.displayName} journey progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={journey.progress.percent}><span style={{ width: `${journey.progress.percent}%` }} /></div>
      {action ? <div className="next-action-block">
        <span className={`next-action-icon ${action.status}`}><ActionIcon nodeKey={action.nodeKey} /></span>
        <div><small>Next for {journey.subject.displayName}</small><h4>{action.title}</h4><p>{action.description}</p><span className="action-timing"><Clock3 />{action.timingLabel}</span><em className={`status ${action.status}`}>{action.stateLabel}</em></div>
        <Link className="primary-cta" href={action.href}>{action.status === "available" ? "Start next step" : "Continue"}<ArrowRight /></Link>
      </div> : <div className="next-action-block complete"><span className="next-action-icon completed"><Check /></span><div><small>All caught up</small><h4>This journey is complete</h4><p>Your records remain available whenever you need them.</p></div><Link className="secondary-button" href={`/journeys/${journey.id}`}>View journey<ArrowRight /></Link></div>}
    </article>
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

function ActionIcon({ nodeKey }: { nodeKey: string }) {
  if (nodeKey === "birth_certificate") return <FileText />;
  if (nodeKey === "child_health_record") return <HeartPulse />;
  if (nodeKey === "vaccination_timeline") return <Syringe />;
  if (nodeKey === "child_identity") return <IdCard />;
  if (nodeKey === "eligible_benefits") return <Gift />;
  if (nodeKey === "ownership_transfer") return <FileText />;
  if (nodeKey === "insurance_cover") return <ShieldCheck />;
  if (nodeKey === "fastag_setup") return <CreditCard />;
  if (nodeKey === "compliance_calendar") return <Clock3 />;
  if (nodeKey === "vehicle_details") return <Car />;
  return <Baby />;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "recently";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}
