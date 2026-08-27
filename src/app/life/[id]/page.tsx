"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, FileText, LoaderCircle, Plus, ShieldCheck, UserRound } from "lucide-react";
import { groupLifeItems, lifeItemKindLabel, type LifeEntityRecordProjection, type LifeItem } from "@/domain/life-item";
import type { JourneySummary } from "@/domain/journey-summary";
import { LifeEntityIcon } from "@/components/life-entity-icon";

export default function LifeItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<LifeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Array<{ id: string; entityId: string; fileName: string; kind: string; createdAt: string }>>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/life", { signal: controller.signal }).then(async (response) => {
      const body = await response.json() as { journeys?: JourneySummary[]; entities?: LifeEntityRecordProjection[]; documents?: Array<{ id: string; entityId: string; fileName: string; kind: string; createdAt: string }>; message?: string };
      if (!response.ok) throw new Error(body.message ?? "This record could not be loaded.");
      const match = groupLifeItems(body.journeys ?? [], body.entities ?? []).find((candidate) => candidate.entityId === decodeURIComponent(id));
      if (!match) throw new Error("This person or thing is not available.");
      setItem(match);
      setDocuments((body.documents ?? []).filter((document) => document.entityId === decodeURIComponent(id)));
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
    {item.actions.length ? <section className="life-item-section content-layer" aria-labelledby="next-title"><header><div><p>What to do now</p><h2 id="next-title">Next steps</h2></div><span>{item.actions.length}</span></header>
      <div className="life-item-action-list">{item.actions.map((action) => <Link href={action.href} key={`${action.journeyId}:${action.nodeKey}`}><span><FileText /></span><div><small>{action.needTitle} · {action.timingLabel}</small><strong>{action.title}</strong><p>{action.description}</p></div><ArrowRight /></Link>)}</div>
    </section> : item.state === "caught_up" ? <section className="life-item-section content-layer" aria-labelledby="next-title"><header><div><p>What to do now</p><h2 id="next-title">All caught up</h2></div><span>0</span></header><div className="journey-section-empty"><CheckCircle2 /><div><strong>Nothing needs your attention</strong><p>Records and future responsibilities remain saved here.</p></div></div></section> : null}
    <section className="life-item-section life-item-needs content-layer" aria-labelledby="services-title"><header><div><p>Saved here</p><h2 id="services-title">Requests and services</h2></div></header>{item.needs.length || item.unavailableNeeds.length ? <div>{item.needs.map((need) => <article key={need.id}><span>{need.status === "completed" ? <CheckCircle2 /> : <ShieldCheck />}</span><div><h3>{need.title}</h3><p>{need.nextAction ? need.nextAction.stateLabel : "All caught up"}</p></div><Link href={`/journeys/${need.id}`}>See all steps<ArrowRight /></Link></article>)}{item.unavailableNeeds.map((need) => <article className="guidance-unavailable" key={need.label}><span><CircleAlert /></span><div><h3>{need.label}</h3><p>{need.description}</p><small>Guided steps not available yet</small></div></article>)}</div> : <div className="journey-section-empty"><ShieldCheck /><div><strong>This record is saved</strong><p>There is no guided service attached to it yet.</p></div></div>}</section>
    <section className="life-item-section life-item-documents content-layer" aria-labelledby="record-documents-title"><header><div><p>Evidence and records</p><h2 id="record-documents-title">Documents</h2></div><Link href="/documents"><Plus />Add a document</Link></header>{documents.length ? <div>{documents.map((document) => <article key={document.id}><span><FileText /></span><div><h3>{document.fileName}</h3><p>{document.kind.replaceAll("_", " ")} · {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(document.createdAt))}</p></div><a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer">View file<ArrowRight /></a></article>)}</div> : <div className="journey-section-empty"><FileText /><div><strong>No documents attached</strong><p>Add a file and choose this record when UMANG asks where it belongs.</p></div></div>}</section>
  </main>;
}
