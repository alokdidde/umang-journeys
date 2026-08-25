"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Building2, CalendarDays, Car, CheckCircle2, FileCheck2, LockKeyhole, MapPin, Users } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { journeyIcons } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
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
  const nextAction = selectJourneyNextAction({ id, projection: state.projection, facts: state.facts, serviceRuns: state.serviceRuns });
  return (
    <main className="page journey-page">
      <ScenicBackdrop />
      <Link href="/journeys" className="floating-back content-layer"><ArrowLeft />All journeys</Link>
      <section className="journey-heading content-layer"><p className="eyebrow"><Baby />New baby</p><h1>Aarav’s journey</h1><p>Take the next step now. Everything else can wait.</p></section>
      <div className="primary-cta-wrap content-layer">
        {nextAction
          ? <Link href={nextAction.href} className="primary-cta"><Baby />{nextAction.nodeKey === "birth_registration" ? "Review birth registration" : `Continue with ${nextAction.title.toLowerCase()}`}<ArrowRight /></Link>
          : <p className="journey-complete-cta"><CheckCircle2 />All services in this journey are complete</p>}
        <TrustNote>Your information stays within this evaluation sandbox.</TrustNote>
      </div>
      <details className="journey-about content-layer">
        <summary>About this journey</summary>
        <section className="context-strip">
          <article><span className="mini-icon green"><Building2 /></span><div><small>Hospital</small><strong>Apollo Hospital</strong><em>Hyderabad</em></div></article>
          <article><span className="mini-icon purple"><Users /></span><div><small>Parents</small><strong>Ananya &amp; Rahul</strong><em>Sharma</em></div></article>
          <article><span className="mini-icon blue"><CalendarDays /></span><div><small>Date of birth</small><strong>24 August 2026</strong><em>Monday</em></div></article>
          <article><span className="mini-icon amber"><MapPin /></span><div><small>State</small><strong>Telangana</strong><em>India</em></div></article>
        </section>
      </details>
      <JourneySteps id={id} title="Your baby’s steps" />
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
    <section className="journey-heading content-layer"><p className="eyebrow"><Car />Vehicle</p><h1>{state.facts["vehicle.makeModel"] ?? "Your vehicle"}</h1><p>Take the next step now. We’ll keep the rest organised.</p></section>
    <div className="primary-cta-wrap content-layer">{nextAction ? <Link href={nextAction.href} className="primary-cta"><FileCheck2 />{nextAction.nodeKey === "vehicle_details" ? "Confirm vehicle details" : `Continue with ${nextAction.title.toLowerCase()}`}<ArrowRight /></Link> : <p className="journey-complete-cta"><CheckCircle2 />All vehicle actions are complete</p>}<TrustNote>Every receipt and document in this vehicle journey is synthetic.</TrustNote></div>
    <details className="journey-about content-layer">
      <summary>About this vehicle</summary>
      <section className="context-strip">
        <article><span className="mini-icon blue"><Car /></span><div><small>Vehicle</small><strong>{state.facts["vehicle.makeModel"] ?? "Tata Nexon"}</strong><em>{registration}</em></div></article>
        <article><span className="mini-icon purple"><Users /></span><div><small>Buyer</small><strong>Ananya Sharma</strong><em>Evaluation profile</em></div></article>
        <article><span className="mini-icon amber"><CalendarDays /></span><div><small>Purchased</small><strong>{state.facts["vehicle.purchaseDate"] ?? "25 August 2026"}</strong><em>Used vehicle</em></div></article>
        <article><span className="mini-icon green"><MapPin /></span><div><small>Transfer</small><strong>{state.facts["vehicle.transferScope"] === "interstate" ? "Interstate" : "Within Telangana"}</strong><em>India</em></div></article>
      </section>
    </details>
    <JourneySteps id={id} title="Your vehicle steps" />
  </main>;
}

function JourneySteps({ id, title }: { id: string; title: string }) {
  const { state } = useJourney();
  return <section className="panel content-layer vehicle-journey-list simple-journey-steps" aria-label={title}>
    <header><div><h2>{title}</h2></div><span>{state.projection.nodes.filter((node) => node.status === "completed").length} of {state.projection.nodes.length} done</span></header>
    <ol>{state.projection.nodes.map((node, index) => {
      const Icon = journeyIcons[node.icon];
      const locked = node.status === "locked";
      const href = node.key === "birth_registration" ? `/journeys/${id}/birth-registration` : node.key === "vehicle_details" ? `/journeys/${id}/vehicle-details` : `/journeys/${id}/services/${node.key}`;
      const label = node.status === "completed" ? "Done" : node.status === "in_progress" || node.status === "waiting_external" ? "In progress" : locked ? "Later" : "Ready";
      const content = <><span className="vehicle-step-number">{index + 1}</span><span className={`event-icon tone-${index}`}><Icon /></span><div><strong>{node.title}</strong><p>{node.description}</p></div><em className={`status ${node.status}`}>{locked ? <LockKeyhole /> : node.status === "completed" ? <CheckCircle2 /> : null}{label}</em></>;
      return <li key={node.key}>{locked ? <article>{content}</article> : <Link href={href}>{content}</Link>}</li>;
    })}</ol>
  </section>;
}
