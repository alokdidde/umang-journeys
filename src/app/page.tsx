"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Files, LoaderCircle, Plus, Route, Sparkles } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { lifeEvents } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import { JourneyCard } from "@/components/journey-card";
import { JourneyStarterComposer } from "@/components/journey-starter-composer";
import type { IntakeJourneyKey } from "@/domain/intake-experience";
import type { LifeEntityRecordProjection } from "@/domain/life-item";

type JourneyListResponse = { journeys: JourneySummary[]; entities: LifeEntityRecordProjection[] };

export default function HomePage() {
  const { state, dispatch } = useJourney();
  const [query, setQuery] = useState(state.statement);
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [entities, setEntities] = useState<LifeEntityRecordProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/life", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as JourneyListResponse & { message?: string };
        if (!response.ok) throw new Error(body.message ?? "The people and things in your life could not be loaded.");
        setJourneys(body.journeys);
        setEntities(body.entities ?? []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "The people and things in your life could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function start(statement?: string, journey?: IntakeJourneyKey) {
    const nextStatement = journey ? "" : (statement ?? query).trim();
    dispatch({ type: "set_statement", value: nextStatement });
    const params = new URLSearchParams();
    if (journey) params.set("journey", journey);
    else if (nextStatement) params.set("analyse", "1");
    router.push(params.size ? `/intake?${params.toString()}` : "/intake");
  }

  if (loading) {
    return <main className="page workflow-state"><LoaderCircle className="service-spinner" /><p>Loading your records…</p></main>;
  }

  return journeys.length > 0 || entities.length > 0
    ? <ReturningHome journeys={journeys} entities={entities} start={start} loadError={loadError} />
    : <FirstVisitHome query={query} setQuery={setQuery} start={start} loadError={loadError} />;
}

function ReturningHome({ journeys, entities, start, loadError }: { journeys: JourneySummary[]; entities: LifeEntityRecordProjection[]; start: (statement?: string, journey?: IntakeJourneyKey) => void; loadError: string | null }) {
  const [query, setQuery] = useState("");
  const attentionJourney = journeys.find((journey) => journey.status !== "completed" && journey.nextAction)
    ?? journeys.find((journey) => journey.status !== "completed");
  const additionalAttention = journeys.filter((journey) => journey.status !== "completed" && journey.id !== attentionJourney?.id && journey.nextAction).slice(0, 2);
  const caughtUpCount = journeys.filter((journey) => journey.status === "completed").length;
  const guidanceUnavailableCount = entities.filter((entity) => entity.unavailableNeeds.length > 0).length;
  return (
    <main className="page returning-home">
      <ScenicBackdrop />
      <section className="dashboard-request content-layer" aria-labelledby="dashboard-request-title">
        <header>
          <p className="eyebrow"><Sparkles size={15} />Ask UMANG</p>
          <h1 id="dashboard-request-title">What do you need help with?</h1>
          <p>Describe what changed or what you want to do. UMANG will check what can help.</p>
        </header>
        <JourneyStarterComposer query={query} setQuery={setQuery} start={start} />
      </section>
      {loadError && <p className="workflow-error content-layer" role="alert">{loadError}</p>}

      <section className="home-next-step content-layer" aria-labelledby="active-journeys-heading">
        {attentionJourney ? <>
          <div className="dashboard-section-heading"><div><span>What to do now</span><h2 id="active-journeys-heading">Next for you</h2></div></div>
          <JourneyCard journey={attentionJourney} />
          {additionalAttention.length ? <div className="home-additional-attention" aria-label="Other things to do">
            <p>Also to do</p>
            {additionalAttention.map((journey) => <Link href={journey.nextAction!.href} key={journey.id}>
              <span><Activity /></span>
              <div><small>{journey.subject.displayName}</small><strong>{journey.nextAction!.title}</strong></div>
              <ArrowRight />
            </Link>)}
          </div> : null}
        </> : guidanceUnavailableCount ? <><h2 className="dashboard-status-heading">Your records are saved</h2><div className="home-guidance-unavailable panel">
          <span><CircleAlert /></span>
          <div><p>Saved without guided steps</p><h2 id="active-journeys-heading">Guidance is not available for {guidanceUnavailableCount === 1 ? "one request" : `${guidanceUnavailableCount} requests`} yet.</h2><small>Nothing has been marked complete. You can add documents or tell us when something changes.</small></div>
          <Link href="/journeys#guidance-unavailable">Open My life<ArrowRight /></Link>
        </div></> : <><h2 className="dashboard-status-heading">Everything is up to date</h2><div className="all-caught-up panel">
          <span><CheckCircle2 /></span>
          <div><p>You’re all caught up</p><h2 id="active-journeys-heading">Nothing needs your attention.</h2><small>Your people, things, documents and records are still saved.</small></div>
          <Link href="/journeys#all-caught-up">Open My life<ArrowRight /></Link>
        </div></>}
      </section>

      <section className="home-shortcuts content-layer" aria-label="More things you can do">
        <Link href="/journeys"><Route /><span><strong>My life</strong><small>{caughtUpCount ? `${caughtUpCount} all caught up · see everything` : "See people, things and steps"}</small></span><ArrowRight /></Link>
        <Link href="/documents"><Files /><span><strong>Add a document</strong><small>We’ll work out where it belongs</small></span><ArrowRight /></Link>
        <Link href="/activity"><Activity /><span><strong>Recent activity</strong><small>See what changed</small></span><ArrowRight /></Link>
      </section>

      <details className="journey-starter home-life-events content-layer">
        <summary><span><Plus />Start with a life event</span><small>Use this if you would rather choose from a familiar starting point.</small></summary>
        <LifeEventGrid start={start} returning />
      </details>
      <TrustNote>The people, things and records shown here use synthetic data.</TrustNote>
    </main>
  );
}

function FirstVisitHome({ query, setQuery, start, loadError }: { query: string; setQuery: (value: string) => void; start: (statement?: string, journey?: IntakeJourneyKey) => void; loadError: string | null }) {
  return (
    <main className="page home-page">
      <ScenicBackdrop />
      <section className="hero content-layer">
        <div className="eyebrow"><Sparkles size={16} /> Citizen services, reorganised around you</div>
        <h1>What do you need help with?</h1>
        <p>Tell us what changed, and we’ll organise the services, documents and responsibilities that follow.</p>
        <JourneyStarterComposer query={query} setQuery={setQuery} start={start} />
        {loadError && <p className="workflow-error" role="alert">{loadError}</p>}
      </section>
      <p className="event-grid-label content-layer">Or choose a life event</p>
      <LifeEventGrid start={start} />
      <TrustNote>Choose one event. We’ll ask only what is needed for the next step.</TrustNote>
    </main>
  );
}

function LifeEventGrid({ start, returning = false }: { start: (statement?: string, journey?: IntakeJourneyKey) => void; returning?: boolean }) {
  return <section className={`event-grid content-layer ${returning ? "compact-event-grid" : ""}`} aria-label="Life events">
    {lifeEvents.map(({ key, label, Icon, active, tone }) => (
      <button key={key} className={`event-card ${active ? "available" : ""}`} onClick={active ? () => start(undefined, key) : undefined} type="button" aria-disabled={!active}>
        {active && returning ? <span className="selected-badge"><Plus size={15} /></span> : null}
        {!active && <span className="preview-badge">Preview</span>}
        <span className={`event-icon ${tone}`}><Icon /></span><strong>{returning && active ? `Another: ${label}` : label}</strong>
      </button>
    ))}
  </section>;
}
