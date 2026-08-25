"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Armchair, ArrowLeft, ArrowRight, Baby, BriefcaseBusiness, Building2, CalendarDays, Car, CheckCircle2, FileCheck2, FolderClock, HeartPulse, House, LockKeyhole, MapPin, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
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
  if (state.projection.templateId === "health-insurance.india.v1") return <HealthInsuranceJourney id={id} />;
  if (state.projection.templateId === "moving-home.india.v1") return <AdditionalJourney id={id} kind="move" />;
  if (state.projection.templateId === "business-setup.india.v1") return <AdditionalJourney id={id} kind="business" />;
  if (state.projection.templateId === "retirement.india.v1") return <AdditionalJourney id={id} kind="retirement" />;
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

function AdditionalJourney({ id, kind }: { id: string; kind: "move" | "business" | "retirement" }) {
  const { state } = useJourney();
  const nextAction = selectJourneyNextAction({ id, projection: state.projection, facts: state.facts, serviceRuns: state.serviceRuns });
  const config: { Icon: LucideIcon; label: string; title: string; intro: string; cta: string; complete: string; steps: string; trust: string; facts: Array<[LucideIcon, string, string, string]> } = kind === "move" ? {
    Icon: House,
    label: "Moving home",
    title: `New home in ${state.facts["move.newCity"] ?? "Hyderabad"}`,
    intro: "Update one record at a time. We’ll keep the acknowledgements together.",
    cta: "Confirm your move",
    complete: "Your move pack is ready",
    steps: "Your moving-home steps",
    trust: "No authority or provider record is changed by this simulation.",
    facts: [
      [MapPin, "New address", state.facts["move.newAddress"] ?? "12 Lake View Road, Madhapur", state.facts["move.pinCode"] ?? "500081"],
      [CalendarDays, "Move date", state.facts["move.date"] ?? "25 September 2026", "Planning date"],
      [Users, "Household", `${state.facts["household.size"] ?? "3"} people`, state.facts["move.occupancy"] ?? "Rented"],
      [FileCheck2, "Address evidence", state.facts["move.hasAddressEvidence"] === "yes" ? "Available" : "Sample available", "Authority-specific"],
    ],
  } : kind === "business" ? {
    Icon: BriefcaseBusiness,
    label: "Starting a business",
    title: state.facts["business.name"] ?? "Ananya Design Studio",
    intro: "Prepare the next registration decision without mistaking readiness for approval.",
    cta: "Confirm the business",
    complete: "Your business launch pack is ready",
    steps: "Your business setup steps",
    trust: "No registration, licence, bank account, or tax status is created here.",
    facts: [
      [BriefcaseBusiness, "Activity", state.facts["business.activity"] ?? "Design services", "Proposed business"],
      [Building2, "Structure", (state.facts["business.structure"] ?? "Sole proprietorship").replaceAll("_", " "), "Review before filing"],
      [MapPin, "Principal place", state.facts["business.city"] ?? "Hyderabad", state.facts["business.state"] ?? "Telangana"],
      [CalendarDays, "Start date", state.facts["business.startDate"] ?? "1 September 2026", "Planning date"],
    ],
  } : {
    Icon: Armchair,
    label: "Retirement",
    title: state.facts["person.name"] ?? "Ananya Sharma",
    intro: "Organise records and verification steps before making a claim or financial decision.",
    cta: "Confirm your retirement",
    complete: "Your retirement pack is ready",
    steps: "Your retirement steps",
    trust: "Every pension result is an indication for official verification, not financial advice.",
    facts: [
      [CalendarDays, "Retirement date", state.facts["retirement.date"] ?? "30 September 2026", "Planning date"],
      [UserRound, "Employment", (state.facts["retirement.employmentSector"] ?? "Private").replaceAll("_", " "), "Route to verify"],
      [FolderClock, "Primary record", (state.facts["retirement.accountType"] ?? "EPFO").toUpperCase(), "Synthetic sample available"],
      [FileCheck2, "Recorded service", `${state.facts["retirement.serviceYears"] ?? "14"} years`, "Official record decides"],
    ],
  };
  const Icon = config.Icon;
  return <main className={`page journey-page ${kind}-journey-page`}>
    <ScenicBackdrop />
    <Link href="/journeys" className="floating-back content-layer"><ArrowLeft />All journeys</Link>
    <section className="journey-heading content-layer"><p className="eyebrow"><Icon />{config.label}</p><h1>{config.title}</h1><p>{config.intro}</p></section>
    <div className="primary-cta-wrap content-layer">{nextAction ? <Link href={nextAction.href} className="primary-cta"><Icon />{nextAction.nodeKey.endsWith("_profile") ? config.cta : `Continue with ${nextAction.title.toLowerCase()}`}<ArrowRight /></Link> : <p className="journey-complete-cta"><CheckCircle2 />{config.complete}</p>}<TrustNote>{config.trust}</TrustNote></div>
    <details className="journey-about content-layer"><summary>About this journey</summary><section className="context-strip">{config.facts.map(([FactIcon, label, value, note], index) => <article key={label}><span className={`mini-icon ${["green", "purple", "blue", "amber"][index]}`}><FactIcon /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>)}</section></details>
    <JourneySteps id={id} title={config.steps} />
  </main>;
}

function HealthInsuranceJourney({ id }: { id: string }) {
  const { state } = useJourney();
  const nextAction = selectJourneyNextAction({ id, projection: state.projection, facts: state.facts, serviceRuns: state.serviceRuns });
  return <main className="page journey-page health-insurance-journey-page">
    <ScenicBackdrop />
    <Link href="/journeys" className="floating-back content-layer"><ArrowLeft />All journeys</Link>
    <section className="journey-heading content-layer"><p className="eyebrow"><HeartPulse />Health &amp; insurance</p><h1>{state.facts["person.name"] ?? "Ananya Sharma"}</h1><p>Understand your cover now, before you need care.</p></section>
    <div className="primary-cta-wrap content-layer">{nextAction ? <Link href={nextAction.href} className="primary-cta"><ShieldCheck />{nextAction.nodeKey === "health_profile" ? "Confirm your health profile" : `Continue with ${nextAction.title.toLowerCase()}`}<ArrowRight /></Link> : <p className="journey-complete-cta"><CheckCircle2 />Your coverage pack is ready</p>}<TrustNote>Every match, identifier, and provider response in this journey is synthetic.</TrustNote></div>
    <details className="journey-about content-layer">
      <summary>About this health plan</summary>
      <section className="context-strip">
        <article><span className="mini-icon green"><UserRound /></span><div><small>For</small><strong>{state.facts["person.name"] ?? "Ananya Sharma"}</strong><em>Evaluation profile</em></div></article>
        <article><span className="mini-icon blue"><ShieldCheck /></span><div><small>Current cover</small><strong>{state.facts["health.currentCover"] === "yes" ? "Policy or card available" : state.facts["health.currentCover"] === "no" ? "No cover recorded" : "Needs verification"}</strong><em>No approval assumed</em></div></article>
        <article><span className="mini-icon purple"><HeartPulse /></span><div><small>ABHA</small><strong>{state.facts["health.abhaStatus"] === "yes" ? "Already available" : "Check or prepare"}</strong><em>Consent required</em></div></article>
        <article><span className="mini-icon amber"><MapPin /></span><div><small>State</small><strong>{state.facts["person.state"] ?? "Telangana"}</strong><em>India</em></div></article>
      </section>
    </details>
    <JourneySteps id={id} title="Your health & insurance steps" />
  </main>;
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
      const href = node.key === "birth_registration" ? `/journeys/${id}/birth-registration` : node.key === "vehicle_details" ? `/journeys/${id}/vehicle-details` : node.key === "health_profile" ? `/journeys/${id}/health-profile` : node.key === "move_profile" ? `/journeys/${id}/move-profile` : node.key === "business_profile" ? `/journeys/${id}/business-profile` : node.key === "retirement_profile" ? `/journeys/${id}/retirement-profile` : `/journeys/${id}/services/${node.key}`;
      const label = node.status === "completed" ? "Done" : node.status === "in_progress" || node.status === "waiting_external" ? "In progress" : locked ? "Later" : "Ready";
      const content = <><span className="vehicle-step-number">{index + 1}</span><span className={`event-icon tone-${index}`}><Icon /></span><div><strong>{node.title}</strong><p>{node.description}</p></div><em className={`status ${node.status}`}>{locked ? <LockKeyhole /> : node.status === "completed" ? <CheckCircle2 /> : null}{label}</em></>;
      return <li key={node.key}>{locked ? <article>{content}</article> : <Link href={href}>{content}</Link>}</li>;
    })}</ol>
  </section>;
}
