"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  ExternalLink,
  FileDown,
  FlaskConical,
  LoaderCircle,
  LockKeyhole,
  RotateCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useJourney } from "@/components/journey-provider";
import {
  isSandboxServiceKey,
  serviceWorkflowDefinitions,
  type ArtifactItemStatus,
  type SandboxServiceRun,
  type ServiceArtifact,
} from "@/domain/service-workflows";

const guidanceLinks: Record<string, { label: string; href: string }> = {
  child_health_record: { label: "Read ABDM citizen guidance", href: "https://abdm.gov.in/citizens" },
  vaccination_timeline: { label: "View the U-WIN citizen guide", href: "https://uwindashboard.mohfw.gov.in/assets/pdf/Self_Registration_Module_U-WIN_SOP_v2_Apr_2024-1.pdf" },
  child_identity: { label: "Read UIDAI child enrolment guidance", href: "https://www.uidai.gov.in/en/296-english-uk/faqs/enrolment-update/aadhaar-enrolment-process/12811-what-is-the-enrolment-procedure-for-children-below-the-age-of-5-years.html" },
  eligible_benefits: { label: "View Telangana programme information", href: "https://hyderabad.telangana.gov.in/scheme/arogya-lakshmi/" },
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function statusLabel(status: ArtifactItemStatus) {
  return ({
    verified: "Verified",
    ready: "Ready",
    due: "Action due",
    upcoming: "Upcoming",
    review: "Needs review",
    information: "Information",
  } as const)[status];
}

export default function SandboxServicePage() {
  const { id, key } = useParams<{ id: string; key: string }>();
  const { state, loadJourney, advanceService } = useJourney();
  const validKey = isSandboxServiceKey(key) ? key : null;
  const definition = validKey ? serviceWorkflowDefinitions[validKey] : null;
  const node = state.projection.nodes.find((candidate) => candidate.key === key);
  const run = validKey ? state.serviceRuns[validKey] : undefined;

  useEffect(() => {
    if (id && state.journeyId !== id) void loadJourney(id);
  }, [id, loadJourney, state.journeyId]);

  useEffect(() => {
    if (!validKey || !run || run.status === "completed" || run.status === "failed" || state.pending || state.error) return;
    const timer = window.setTimeout(() => void advanceService(id, validKey), 850);
    return () => window.clearTimeout(timer);
  }, [advanceService, id, run, state.error, state.pending, validKey]);

  if (!definition || !validKey) return <main className="page workflow-state"><h1>Service not found</h1><p>This journey does not include that service.</p><Link className="primary-cta" href={`/journeys/${id}`}>Return to journey</Link></main>;
  if (state.pending && state.journeyId !== id) return <main className="page workflow-state"><LoaderCircle className="service-spinner" /><p>Loading service workspace…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>Unable to load this service.</h1><p>{state.error}</p><Link className="primary-cta" href={`/journeys/${id}`}>Return to journey</Link></main>;
  if (node?.status === "locked") return <main className="page workflow-state"><LockKeyhole /><h1>This service is still locked.</h1><p>Complete the birth registration to share verified birth details with the sandbox.</p><Link className="primary-cta" href={`/journeys/${id}`}>Return to journey</Link></main>;

  const completed = run?.status === "completed";
  const nextStage = definition.stages[run?.currentStage ?? 0];
  const guidance = guidanceLinks[validKey];

  return (
    <main className="page service-page">
      <div className="service-shell">
        <nav className="service-navigation" aria-label="Service navigation">
          <Link href={`/journeys/${id}`} className="floating-back"><ArrowLeft />Back to journey</Link>
          <span><FlaskConical />Evaluation sandbox</span>
        </nav>

        <header className="service-workspace-header">
          <div>
            <p className="eyebrow"><Server />{definition.agencyShort}</p>
            <h1>{node?.title ?? validKey}</h1>
            <p>{definition.explanation}</p>
          </div>
          <div className={`service-state-card ${completed ? "completed" : run ? "processing" : "ready"}`} role="status" aria-live="polite">
            <span>{completed ? <BadgeCheck /> : run ? <LoaderCircle className="service-spinner" /> : <ShieldCheck />}</span>
            <div>
              <small>Current state</small>
              <strong>{completed ? "Completed" : run?.status === "waiting_external" ? "Waiting for provider" : run ? "Processing securely" : "Ready to connect"}</strong>
              <p>{completed ? `Finished ${formatTimestamp(run.completedAt ?? run.updatedAt)}` : run ? `${run.progress}% complete · ${definition.turnaround}` : "No data has been sent yet"}</p>
            </div>
          </div>
        </header>

        <div className="service-workspace-grid">
          <div className="service-main-column">
            {!run ? (
              <section className="service-start-card panel">
                <span className="service-emblem"><Activity /></span>
                <p className="eyebrow">Prepared request</p>
                <h2>Everything needed is ready.</h2>
                <p>The simulation will show each validation and provider hand-off as it happens. You can refresh at any point without losing progress.</p>
                <div className="service-preflight">
                  <span><CheckCircle2 />Birth registration completed</span>
                  <span><CheckCircle2 />Required facts available</span>
                  <span><CheckCircle2 />Sandbox connection healthy</span>
                </div>
                <button className="primary-cta service-action" type="button" disabled={state.pending} onClick={() => void advanceService(id, validKey)}>
                  {definition.action}<ArrowRight />
                </button>
                <p className="service-consent-note"><ShieldCheck />This runs a simulation only. No production government service is contacted.</p>
              </section>
            ) : (
              <>
                <ServiceProgress run={run} stages={definition.stages} nextStageTitle={nextStage?.title} pending={state.pending} />
                {state.error ? (
                  <section className="service-recovery panel" role="alert">
                    <div><RotateCw /><span><strong>Progress is saved</strong><p>{state.error} Retry from the last completed check.</p></span></div>
                    <button type="button" className="secondary-button" onClick={() => void advanceService(id, validKey)}>Retry provider check</button>
                  </section>
                ) : null}
                {completed && run.artifact ? <ServiceArtifactView artifact={run.artifact} /> : null}
              </>
            )}
          </div>

          <aside className="service-sidebar" aria-label="Connection details">
            <section className="panel service-connection-card">
              <div className="connection-heading"><span><Database /></span><div><small>Connected provider</small><strong>{definition.agency}</strong></div><i>Sandbox</i></div>
              <dl>
                <div><dt>Environment</dt><dd>Isolated evaluation</dd></div>
                <div><dt>Expected flow</dt><dd>{definition.turnaround}</dd></div>
                {run ? <><div><dt>Run ID</dt><dd className="technical-value">{run.runId}</dd></div><div><dt>Last update</dt><dd>{formatTimestamp(run.updatedAt)}</dd></div></> : null}
              </dl>
            </section>

            <section className="panel data-sharing-card">
              <h2><LockKeyhole />Data used for this step</h2>
              <ul>{definition.dataShared.map((item) => <li key={item}><Check />{item}</li>)}</ul>
              <p><ShieldCheck />Data stays inside this evaluation environment.</p>
            </section>

            {guidance ? <a className="official-guidance-link" href={guidance.href} target="_blank" rel="noreferrer">{guidance.label}<ExternalLink /></a> : null}
          </aside>
        </div>

        {completed ? (
          <div className="service-footer-actions">
            {validKey === "birth_certificate" ? <Link className="primary-cta" href={`/api/journeys/${id}/certificate`} prefetch={false}><FileDown />Download sandbox PDF</Link> : null}
            <Link className={validKey === "birth_certificate" ? "secondary-button" : "primary-cta"} href={`/journeys/${id}`}><Check />Continue journey</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function ServiceProgress({ run, stages, nextStageTitle, pending }: {
  run: SandboxServiceRun;
  stages: typeof serviceWorkflowDefinitions.child_health_record.stages;
  nextStageTitle?: string;
  pending: boolean;
}) {
  return (
    <section className="panel service-progress-card">
      <header>
        <div><span className="progress-icon">{run.status === "completed" ? <CheckCircle2 /> : <LoaderCircle className="service-spinner" />}</span><div><p className="eyebrow">Live service run</p><h2>{run.status === "completed" ? "All checks completed" : pending ? "Running provider check…" : nextStageTitle ?? "Finalising result"}</h2></div></div>
        <strong className="progress-number">{run.progress}%</strong>
      </header>
      <div className="service-progress-track" aria-label={`${run.progress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={run.progress}><span style={{ width: `${run.progress}%` }} /></div>
      <ol className="service-timeline">
        {stages.map((stage, index) => {
          const event = run.events.find((candidate) => candidate.stageKey === stage.key);
          const active = !event && index === run.currentStage && run.status !== "completed";
          return <li key={stage.key} className={event ? "done" : active ? "active" : "upcoming"}>
            <span className="timeline-marker">{event ? <Check /> : active ? <LoaderCircle className="service-spinner" /> : <Circle />}</span>
            <div><strong>{stage.title}</strong><p>{event?.detail ?? (active ? "The sandbox adapter is working on this check." : "Waiting for the previous check.")}</p></div>
            <time dateTime={event?.occurredAt}>{event ? formatTimestamp(event.occurredAt) : active ? "In progress" : "Pending"}</time>
          </li>;
        })}
      </ol>
      <footer><Clock3 />Started {formatTimestamp(run.startedAt)}<span>Receipt {run.receipt}</span></footer>
    </section>
  );
}

function ServiceArtifactView({ artifact }: { artifact: ServiceArtifact }) {
  return (
    <section className="panel service-artifact">
      <header><span><BadgeCheck /></span><div><p className="eyebrow">Generated result</p><h2>{artifact.title}</h2><p>{artifact.subtitle}</p></div><div className="artifact-reference"><small>{artifact.referenceLabel}</small><strong>{artifact.referenceValue}</strong></div></header>
      <dl className="artifact-facts">{artifact.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd>{fact.status ? <span className={`artifact-status ${fact.status}`}>{statusLabel(fact.status)}</span> : null}</div>)}</dl>
      {artifact.groups.map((group) => <section className="artifact-group" key={group.title}><h3>{group.title}</h3>{group.description ? <p>{group.description}</p> : null}<div>{group.items.map((item) => <article key={item.title}><span className={`artifact-item-icon ${item.status}`}>{item.status === "verified" || item.status === "ready" ? <CheckCircle2 /> : item.status === "due" || item.status === "review" ? <Clock3 /> : <Circle />}</span><div><strong>{item.title}</strong><p>{item.meta}</p>{item.detail ? <small>{item.detail}</small> : null}</div><span className={`artifact-status ${item.status}`}>{statusLabel(item.status)}</span></article>)}</div></section>)}
      <p className="artifact-notice"><ShieldCheck />{artifact.notice}</p>
    </section>
  );
}
