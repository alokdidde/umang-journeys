"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { groupLifeItems, lifeItemKindLabel, type LifeEntityRecordProjection, type LifeItem } from "@/domain/life-item";
import type { JourneySummary } from "@/domain/journey-summary";
import { LifeEntityIcon } from "@/components/life-entity-icon";

export function LifeRequestAdded() {
  const searchParams = useSearchParams();
  const requestedKey = searchParams.toString();
  const requestedIds = useMemo(() => [...new Set(new URLSearchParams(requestedKey).getAll("subject"))].slice(0, 5), [requestedKey]);
  const [items, setItems] = useState<LifeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/life", { signal: controller.signal }).then(async (response) => {
      const body = await response.json() as { journeys?: JourneySummary[]; entities?: LifeEntityRecordProjection[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? "What you added could not be loaded.");
      const grouped = groupLifeItems(body.journeys ?? [], body.entities ?? []);
      const byId = new Map(grouped.map((item) => [item.entityId, item]));
      const requested = requestedIds.map((id) => byId.get(id)).filter((item): item is LifeItem => Boolean(item));
      if (!requested.length) throw new Error("The saved people and things are available in My life.");
      setItems(requested);
    }).catch((cause) => {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "What you added could not be loaded.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestedIds]);

  if (loading) return <main className="page workflow-state"><LoaderCircle className="service-spinner" /><p>Loading what was added…</p></main>;
  if (error) return <main className="page workflow-state"><p role="alert">{error}</p><Link href="/journeys">Open My life</Link></main>;

  const firstAction = items.flatMap((item) => item.actions)[0];
  const hasUnavailableGuidance = items.some((item) => item.unavailableNeeds.length > 0);
  const savedLabel = `${items.length} ${items.length === 1 ? "record is" : "records are"}`;
  return <main className="page life-added-page">
    <header className="life-added-hero content-layer">
      <span><CheckCircle2 aria-hidden="true" /></span>
      <div><p>Saved to My life</p><h1>Everything in your request was added</h1><small>{savedLabel} now kept separately, with the right work under each one.</small></div>
    </header>
    <section className="life-added-summary content-layer" aria-labelledby="added-summary-title">
      <header><div><p>Your request, organised</p><h2 id="added-summary-title">What was added</h2></div><span>{items.length}</span></header>
      <div className="life-added-list">{items.map((item) => <article key={item.entityId}>
        <span className={`journey-avatar ${item.type}`}><LifeEntityIcon kind={item.entityKind} /></span>
        <div><small>{subjectLabel(item)}</small><h3>{item.displayName}</h3><p>{item.needs.map((need) => need.title).join(" · ")}</p></div>
        <Link href={`/life/${encodeURIComponent(item.entityId)}`}>See everything<ArrowRight /></Link>
      </article>)}</div>
    </section>
    <section className="life-added-next content-layer" aria-labelledby="added-next-title">
      <ShieldCheck aria-hidden="true" />
      <div><p>What to do now</p><h2 id="added-next-title">{firstAction ? firstAction.title : hasUnavailableGuidance ? "Your requests are saved" : "Your records are ready"}</h2><small>{firstAction ? firstAction.description : hasUnavailableGuidance ? "Open My life to see which requests do not have verified guided steps yet." : "Open My life whenever you want to review them."}</small></div>
      <div>{firstAction ? <Link className="primary-cta" href={firstAction.href}>Start this step<ArrowRight /></Link> : null}<Link className={firstAction ? "secondary-button" : "primary-cta"} href="/journeys">Open My life</Link></div>
    </section>
  </main>;
}

function subjectLabel(item: LifeItem) {
  return lifeItemKindLabel(item);
}
