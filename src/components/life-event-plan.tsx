"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Baby, BriefcaseBusiness, Car, Check, CheckCircle2, Circle, Clock3, HeartPulse, House, LoaderCircle, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { EntityContextDrawer } from "@/components/entity-context-drawer";
import { JourneyNodeIcon } from "@/components/icons";
import { JourneyMapDrawer } from "@/components/journey-map-drawer";
import { useJourney } from "@/components/journey-provider";
import type { JourneyNode, JourneyProjection } from "@/domain/journey-engine";
import { journeyNodeHref, type JourneySubject } from "@/domain/journey-summary";
import { deriveJourneyWork } from "@/domain/journey-work";

type PlanConfig = { Icon: LucideIcon; eyebrow: string; title: string; description: string; mapTitle: string; details: Array<{ label: string; value: string }> };

function firstFact(facts: Record<string, string>, keys: string[], fallback: string) {
  return keys.map((key) => facts[key]).find(Boolean) ?? fallback;
}

function planConfig(templateId: string, facts: Record<string, string>, subject: JourneySubject): PlanConfig {
  if (templateId === "vehicle-purchase.india.v1") return { Icon: Car, eyebrow: "Vehicle plan", title: "Buying a vehicle", description: `Everything to set up and look after ${subject.displayName}, in the right order.`, mapTitle: "Your vehicle plan", details: [{ label: "Vehicle", value: subject.displayName }, { label: "Registration", value: firstFact(facts, ["vehicle.registrationNumber"], "Not added yet") }, { label: "Purchase date", value: firstFact(facts, ["vehicle.purchaseDate"], "Not added yet") }, { label: "Transfer", value: firstFact(facts, ["vehicle.transferScope"], "Not confirmed") }] };
  if (templateId === "health-insurance.india.v1") return { Icon: HeartPulse, eyebrow: "Health plan", title: "Health & insurance", description: `Cover, health records and the next useful steps for ${subject.displayName}.`, mapTitle: "Health & insurance plan", details: [{ label: "For", value: subject.displayName }, { label: "State", value: firstFact(facts, ["person.state"], "Not added yet") }, { label: "Current cover", value: firstFact(facts, ["health.currentCover"], "Not confirmed") }, { label: "ABHA", value: firstFact(facts, ["health.abhaStatus"], "Not confirmed") }] };
  if (templateId === "moving-home.india.v1") return { Icon: House, eyebrow: "Home plan", title: "Moving home", description: `Address changes, records and services for ${subject.displayName}, kept together.`, mapTitle: "Your moving-home plan", details: [{ label: "Home", value: subject.displayName }, { label: "Address", value: firstFact(facts, ["move.newAddress"], "Not added yet") }, { label: "City", value: firstFact(facts, ["move.newCity"], "Not added yet") }, { label: "Move date", value: firstFact(facts, ["move.date"], "Not added yet") }] };
  if (templateId === "business-setup.india.v1") return { Icon: BriefcaseBusiness, eyebrow: "Business plan", title: "Starting a business", description: `Registrations, licences and ongoing responsibilities for ${subject.displayName}.`, mapTitle: "Your business plan", details: [{ label: "Business", value: subject.displayName }, { label: "Activity", value: firstFact(facts, ["business.activity"], "Not added yet") }, { label: "Structure", value: firstFact(facts, ["business.structure"], "Not confirmed").replaceAll("_", " ") }, { label: "City", value: firstFact(facts, ["business.city"], "Not added yet") }] };
  if (templateId === "retirement.india.v1") return { Icon: UserRound, eyebrow: "Retirement plan", title: "Retirement", description: `Records, benefits and recurring tasks for ${subject.displayName}.`, mapTitle: "Your retirement plan", details: [{ label: "For", value: subject.displayName }, { label: "Retirement date", value: firstFact(facts, ["retirement.date"], "Not added yet") }, { label: "Employment", value: firstFact(facts, ["retirement.employmentSector"], "Not confirmed").replaceAll("_", " ") }, { label: "Primary record", value: firstFact(facts, ["retirement.accountType"], "Not confirmed").toUpperCase() }] };
  return { Icon: Baby, eyebrow: "Child plan", title: "Having a baby", description: `The registrations, care and future steps for ${subject.displayName}, in one clear plan.`, mapTitle: "Your baby plan", details: [{ label: "Child", value: subject.displayName }, { label: "Date of birth", value: firstFact(facts, ["child.dateOfBirth"], "Not added yet") }, { label: "Hospital", value: firstFact(facts, ["birth.hospital", "birth.hospitalName", "child.hospital"], "Not added yet") }, { label: "State", value: firstFact(facts, ["child.state", "birth.state"], "Telangana") }] };
}

function nodeState(node: JourneyNode) {
  if (node.status === "waiting_external") return { label: "Waiting for an update", Icon: Clock3 };
  if (node.status === "in_progress") return { label: "In progress", Icon: LoaderCircle };
  if (node.status === "blocked") return { label: "Needs your attention", Icon: Circle };
  if (node.status === "completed" || node.status === "skipped") return { label: "Done", Icon: CheckCircle2 };
  if (node.status === "available") return { label: "Ready", Icon: Sparkles };
  return { label: "Later", Icon: Circle };
}

function ActionCard({ id, node, featured = false }: { id: string; node: JourneyNode; featured?: boolean }) {
  const state = nodeState(node);
  const StateIcon = state.Icon;
  return <Link href={journeyNodeHref(id, node.key)} className={`life-plan-action ${featured ? "featured" : ""}`}>
    <span className="life-plan-action-icon"><JourneyNodeIcon name={node.icon} /></span>
    <div><small><StateIcon aria-hidden="true" />{state.label} · {node.timing}</small><h3>{node.title}</h3><p>{node.description}</p><strong>Open this step <ArrowRight aria-hidden="true" /></strong></div>
  </Link>;
}

function dependencyText(node: JourneyNode, projection: JourneyProjection) {
  const dependencies = [...(node.dependsOn ?? []), ...(node.dependsOnAny ?? [])];
  const names = dependencies.map((key) => projection.nodes.find((candidate) => candidate.key === key)?.title).filter(Boolean);
  return names.length ? `After ${names.join(" or ")}` : null;
}

function PlanTimeline({ id, projection }: { id: string; projection: JourneyProjection }) {
  const work = deriveJourneyWork(projection);
  const visible = projection.nodes.filter((node) => node.applicability !== "not_applicable" && node.status !== "skipped");
  const completed = visible.filter((node) => node.status === "completed").length;
  return <section className="life-plan-timeline" aria-labelledby="plan-timeline-title">
    <header><div><h2 id="plan-timeline-title">What this involves</h2><p>{completed === 0 ? "Nothing is marked done yet. We’ll guide you one step at a time." : `You’ve finished ${completed} of ${visible.length} steps in this plan.`}</p></div></header>
    <div className="life-plan-branches">{projection.branches.filter((branch) => branch.active || branch.requirement === "required" || branch.applicability === "pending").map((branch) => {
      const nodes = visible.filter((node) => node.branchKey === branch.key);
      if (!nodes.length) return null;
      return <section className="life-plan-branch" key={branch.key}>
        <header><span>{branch.requirement === "required" ? "Part of your plan" : branch.active ? "Added to your plan" : "May be needed"}</span><h3>{branch.title}</h3><p>{branch.description}</p></header>
        <ol>{nodes.map((node) => {
          const state = nodeState(node);
          const dependency = dependencyText(node, projection);
          const canOpen = node.actionable && node.status !== "locked";
          return <li className={`life-plan-step status-${node.status}`} key={node.key}><span className="life-plan-step-marker">{node.status === "completed" ? <Check aria-hidden="true" /> : <JourneyNodeIcon name={node.icon} />}</span><div><small>{state.label}{dependency ? ` · ${dependency}` : ""}</small><h4>{node.title}</h4><p>{node.description}</p>{canOpen ? <Link href={journeyNodeHref(id, node.key)}>View step <ArrowRight aria-hidden="true" /></Link> : null}</div></li>;
        })}</ol>
      </section>;
    })}</div>
    {work.notNeeded.length > 0 ? <details className="life-plan-not-needed"><summary>Steps that don’t apply ({work.notNeeded.length})</summary><ul>{work.notNeeded.map((node) => <li key={node.key}>{node.title}</li>)}</ul></details> : null}
  </section>;
}

export function LifeEventPlan({ id }: { id: string }) {
  const { state } = useJourney();
  const subject = state.subject ?? { id: "current-subject", type: "person" as const, displayName: firstFact(state.facts, ["child.name", "vehicle.makeModel", "person.name", "business.name", "move.newCity"], "this record") };
  const config = planConfig(state.projection.templateId, state.facts, subject);
  const work = deriveJourneyWork(state.projection);
  const Icon = config.Icon;

  return <main className="page life-plan-page"><div className="life-plan-shell">
    <Link href="/journeys" className="life-plan-back"><ArrowLeft aria-hidden="true" />My life</Link>
    <section className="life-plan-hero"><div className="life-plan-portrait"><span className="life-plan-portrait-ring" /><Icon aria-hidden="true" /></div><div className="life-plan-hero-copy"><p className="eyebrow"><Icon aria-hidden="true" />{config.eyebrow}</p><h1>{config.title}</h1><p>{config.description}</p></div><EntityContextDrawer subject={subject} details={config.details} evidence={state.evidence} /></section>
    {work.happeningNow.length > 0 ? <section className="life-plan-section happening" aria-labelledby="happening-title"><header><h2 id="happening-title">Happening now</h2></header><div className="life-plan-action-grid">{work.happeningNow.map((node) => <ActionCard id={id} node={node} key={node.key} featured />)}</div></section> : null}
    <section className="life-plan-section ready" aria-labelledby="ready-title"><header><h2 id="ready-title">Ready for you</h2><p>{work.readyNow.length > 1 ? "You can start with either of these. They can move forward separately." : work.readyNow.length === 1 ? "This is the most useful step you can take now." : "There’s nothing else you need to start right now."}</p></header>{work.readyNow.length > 0 ? <div className="life-plan-action-grid">{work.readyNow.map((node, index) => <ActionCard id={id} node={node} key={node.key} featured={index === 0} />)}</div> : <div className="life-plan-caught-up"><CheckCircle2 aria-hidden="true" /><div><h3>{work.happeningNow.length > 0 ? "Nothing else needs your attention" : "You’re caught up for now"}</h3><p>{work.happeningNow.length > 0 ? "The work already underway is shown above." : "We’ll keep future and waiting steps visible below."}</p></div></div>}</section>
    <PlanTimeline id={id} projection={state.projection} />
    <JourneyMapDrawer id={id} title={config.mapTitle} />
  </div></main>;
}
