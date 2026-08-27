"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { groupLifeItems, lifeItemKindLabel, type LifeEntityRecordProjection, type LifeItem } from "@/domain/life-item";
import type { JourneySummary } from "@/domain/journey-summary";
import { LifeEntityIcon } from "@/components/life-entity-icon";

export default function LifeItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<LifeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/life", { signal: controller.signal }).then(async (response) => {
      const body = await response.json() as { journeys?: JourneySummary[]; entities?: LifeEntityRecordProjection[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? "This record could not be loaded.");
      const match = groupLifeItems(body.journeys ?? [], body.entities ?? []).find((candidate) => candidate.entityId === decodeURIComponent(id));
      if (!match) throw new Error("This person or thing is not available.");
      setItem(match);
    }).catch((cause) => {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "This record could not be loaded.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  if (loading) return <main className="page workflow-state"><LoaderCircle className="service-spinner" /><p>Loading this record…</p></main>;
  if (!item || error) return <main className="page workflow-state"><p role="alert">{error ?? "This record is not available."}</p><Link href="/journeys">Back to My life</Link></main>;

  return <main className="page life-item-page">
    <div className="content-layer"><Link className="back-link" href="/journeys"><ArrowLeft />My life</Link></div>
    <header className="life-item-hero content-layer"><span className={`journey-avatar ${item.type}`}><LifeEntityIcon kind={item.entityKind} /></span><div><p>{lifeItemKindLabel(item)}</p><h1>{item.displayName}</h1><span>{item.needs.length ? `${item.needs.length} ${item.needs.length === 1 ? "service" : "services"} saved here` : "Record saved in My life"}</span></div><em><ShieldCheck />Saved in My life</em></header>
    {item.context?.connectedPeople?.length ? <section className="life-item-section life-item-people content-layer" aria-labelledby="people-title"><header><div><p>People & roles</p><h2 id="people-title">Connected to {item.displayName}</h2></div><span>{item.context.connectedPeople.length}</span></header><div>{item.context.connectedPeople.map((person) => <article key={person.entityId}><span><UserRound aria-hidden="true" /></span><div><h3>{person.displayName}</h3><p>{person.roles.join(" · ")}{person.ownershipShare === undefined ? "" : ` · ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(person.ownershipShare)}% share`}</p></div>{person.canAct === undefined ? null : <small>{person.canAct ? "Can act" : "No signing authority"}</small>}</article>)}</div></section> : null}
    <section className="life-item-section content-layer" aria-labelledby="next-title"><header><div><p>What to do now</p><h2 id="next-title">{item.actions.length ? "Next steps" : "All caught up"}</h2></div><span>{item.actions.length}</span></header>
      {item.actions.length ? <div className="life-item-action-list">{item.actions.map((action) => <Link href={action.href} key={`${action.journeyId}:${action.nodeKey}`}><span><FileText /></span><div><small>{action.needTitle} · {action.timingLabel}</small><strong>{action.title}</strong><p>{action.description}</p></div><ArrowRight /></Link>)}</div> : <div className="journey-section-empty"><CheckCircle2 /><div><strong>Nothing needs your attention</strong><p>Records and future responsibilities remain saved here.</p></div></div>}
    </section>
    <section className="life-item-section life-item-needs content-layer" aria-labelledby="services-title"><header><div><p>Saved here</p><h2 id="services-title">Services and responsibilities</h2></div></header>{item.needs.length ? <div>{item.needs.map((need) => <article key={need.id}><span>{need.status === "completed" ? <CheckCircle2 /> : <ShieldCheck />}</span><div><h3>{need.title}</h3><p>{need.nextAction ? need.nextAction.stateLabel : "All caught up"}</p></div><Link href={`/journeys/${need.id}`}>See all steps<ArrowRight /></Link></article>)}</div> : item.unavailableNeeds.length ? <div>{item.unavailableNeeds.map((need) => <article key={need.label}><span><ShieldCheck /></span><div><h3>{need.label}</h3><p>{need.description}</p></div><small>Guided steps not available yet</small></article>)}</div> : <div className="journey-section-empty"><ShieldCheck /><div><strong>This record is saved</strong><p>There is no guided service attached to it yet.</p></div></div>}</section>
  </main>;
}
