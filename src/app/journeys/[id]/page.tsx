"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Building2, CalendarDays, Car, CheckCircle2, FileCheck2, LockKeyhole, MapPin, Route, Users } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { journeyIcons } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import { isSandboxServiceKey } from "@/domain/service-workflows";
import { selectJourneyNextAction } from "@/domain/journey-summary";

export default function JourneyRevealPage() {
  const { state, loadJourney } = useJourney();
  const { id } = useParams<{ id: string }>();
  useEffect(() => {
    if (id && state.journeyId !== id) void loadJourney(id);
  }, [id, loadJourney, state.journeyId]);
  if (state.pending && state.journeyId !== id) return <main className="page workflow-state"><p>Loading your journey…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>We couldn’t load this journey.</h1><p>{state.error}</p><Link href="/intake" className="primary-cta">Start again</Link></main>;
  if (state.projection.templateId === "vehicle-purchase.india.v1") return <VehicleJourney id={id} />;
  const [registration, certificate, ...downstream] = state.projection.nodes;
  const nextAction = selectJourneyNextAction({ id, projection: state.projection, facts: state.facts, serviceRuns: state.serviceRuns });
  return (
    <main className="page journey-page">
      <ScenicBackdrop />
      <Link href="/intake" className="floating-back content-layer"><ArrowLeft />Back to intake</Link>
      <section className="journey-heading content-layer"><h1>Your family journey is ready.</h1><p>We’ve assembled the right services around your child’s birth. Follow the journey below—we’ll guide you every step.</p></section>
      <section className="context-strip content-layer">
        <article><span className="mini-icon green"><Building2 /></span><div><small>Hospital</small><strong>Apollo Hospital</strong><em>Hyderabad</em></div></article>
        <article><span className="mini-icon purple"><Users /></span><div><small>Parents</small><strong>Ananya &amp; Rahul</strong><em>Sharma</em></div></article>
        <article><span className="mini-icon blue"><CalendarDays /></span><div><small>Date of birth</small><strong>24 August 2026</strong><em>Monday</em></div></article>
        <article><span className="mini-icon amber"><MapPin /></span><div><small>State</small><strong>Telangana</strong><em>India</em></div></article>
      </section>
      <section className="journey-graph panel content-layer" aria-label="Journey dependency graph">
        <p className="prefill-note">Some details have been pre-filled from your synthetic hospital and profile records.</p>
        <div className="graph-layout">
          <GraphNode node={registration} number={1} />
          <span className="graph-arrow"><ArrowRight /></span>
          <GraphNode node={certificate} number={2} href={certificate.status === "locked" ? undefined : `/journeys/${id}/services/birth_certificate`} />
          <div className="branch-line" aria-hidden="true" />
          <div className="downstream-list">
            {downstream.map((node, index) => {
              const Icon = journeyIcons[node.icon];
              const run = isSandboxServiceKey(node.key) ? state.serviceRuns[node.key] : undefined;
              const status = node.status === "locked" ? "Locked" : node.status === "completed" ? "Completed" : node.status === "waiting_external" ? "Waiting for provider" : node.status === "in_progress" ? `${run?.progress ?? 0}% complete` : "Ready to start";
              const contents = <><span className="node-number">{index + 3}</span><span className={`event-icon tone-${index}`}><Icon /></span><div><strong>{node.title}</strong><p>{node.description}</p></div><span className={`status ${node.status}`}>{node.status === "locked" && <LockKeyhole />}{status}</span></>;
              return node.status === "locked"
                ? <article key={node.key} className="compact-node" title="Complete birth registration first">{contents}</article>
                : <Link key={node.key} href={`/journeys/${id}/services/${node.key}`} className="compact-node service-node-link">{contents}</Link>;
            })}
          </div>
        </div>
      </section>
      <div className="primary-cta-wrap content-layer">
        {nextAction
          ? <Link href={nextAction.href} className="primary-cta"><Baby />{nextAction.nodeKey === "birth_registration" ? "Review birth registration" : `Continue with ${nextAction.title.toLowerCase()}`}<ArrowRight /></Link>
          : <p className="journey-complete-cta"><CheckCircle2 />All services in this journey are complete</p>}
        <TrustNote>Your information stays within this evaluation sandbox.</TrustNote>
      </div>
    </main>
  );
}

function VehicleJourney({ id }: { id: string }) {
  const { state } = useJourney();
  const nextAction = selectJourneyNextAction({ id, projection: state.projection, facts: state.facts, serviceRuns: state.serviceRuns });
  const registration = state.facts["vehicle.registrationNumber"] ?? "Registration pending";
  return <main className="page journey-page vehicle-journey-page">
    <ScenicBackdrop />
    <Link href="/" className="floating-back content-layer"><ArrowLeft />All journeys</Link>
    <section className="journey-heading content-layer"><p className="eyebrow"><Car />Buying a Vehicle</p><h1>Your vehicle journey is ready.</h1><p>Confirm the vehicle once, provide evidence where it is genuinely required, and follow each provider action without losing your place.</p></section>
    <section className="context-strip content-layer">
      <article><span className="mini-icon blue"><Car /></span><div><small>Vehicle</small><strong>{state.facts["vehicle.makeModel"] ?? "Tata Nexon"}</strong><em>{registration}</em></div></article>
      <article><span className="mini-icon purple"><Users /></span><div><small>Buyer</small><strong>Ananya Sharma</strong><em>Evaluation profile</em></div></article>
      <article><span className="mini-icon amber"><CalendarDays /></span><div><small>Purchased</small><strong>{state.facts["vehicle.purchaseDate"] ?? "25 August 2026"}</strong><em>Used vehicle</em></div></article>
      <article><span className="mini-icon green"><MapPin /></span><div><small>Transfer</small><strong>{state.facts["vehicle.transferScope"] === "interstate" ? "Interstate" : "Within Telangana"}</strong><em>India</em></div></article>
    </section>
    <section className="panel content-layer vehicle-journey-list" aria-label="Vehicle journey steps">
      <header><div><p className="eyebrow"><Route />Your plan</p><h2>One vehicle, five coordinated outcomes</h2></div><span>{state.projection.nodes.filter((node) => node.status === "completed").length} of {state.projection.nodes.length} complete</span></header>
      <ol>{state.projection.nodes.map((node, index) => {
        const Icon = journeyIcons[node.icon];
        const locked = node.status === "locked";
        const href = node.key === "vehicle_details" ? `/journeys/${id}/vehicle-details` : `/journeys/${id}/services/${node.key}`;
        const label = node.status === "completed" ? "Completed" : node.status === "in_progress" || node.status === "waiting_external" ? "In progress" : locked ? "Waiting for prerequisite" : "Ready to start";
        const content = <><span className="vehicle-step-number">{index + 1}</span><span className={`event-icon tone-${index}`}><Icon /></span><div><strong>{node.title}</strong><p>{node.description}</p><small><CalendarDays />{node.timing}</small></div><em className={`status ${node.status}`}>{locked ? <LockKeyhole /> : node.status === "completed" ? <CheckCircle2 /> : null}{label}</em></>;
        return <li key={node.key}>{locked ? <article>{content}</article> : <Link href={href}>{content}</Link>}</li>;
      })}</ol>
    </section>
    <div className="primary-cta-wrap content-layer">{nextAction ? <Link href={nextAction.href} className="primary-cta"><FileCheck2 />{nextAction.nodeKey === "vehicle_details" ? "Confirm vehicle details" : `Continue with ${nextAction.title.toLowerCase()}`}<ArrowRight /></Link> : <p className="journey-complete-cta"><CheckCircle2 />All vehicle actions are complete</p>}<TrustNote>Every receipt and document in this vehicle journey is synthetic.</TrustNote></div>
  </main>;
}

function GraphNode({ node, number, href }: { node: ReturnType<typeof useJourney>["state"]["projection"]["nodes"][number]; number: number; href?: string }) {
  const Icon = journeyIcons[node.icon];
  const label = node.status === "locked" ? "Complete registration first" : node.status === "completed" ? "Completed" : node.status === "in_progress" ? "In progress" : "Available";
  const contents = <><span className="node-number">{number}</span><span className="event-icon rose"><Icon /></span><strong>{node.title}</strong><p>{node.description}</p><span className={`status ${node.status}`}>{node.status === "locked" ? <LockKeyhole /> : null}{label}</span></>;
  return href ? <Link href={href} className={`graph-node service-node-link ${node.status}`}>{contents}</Link> : <article className={`graph-node ${node.status}`}>{contents}</article>;
}
