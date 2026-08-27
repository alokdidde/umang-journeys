"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Car, CheckCircle2, LoaderCircle, Plus, Route, ShieldPlus } from "lucide-react";
import { LifeCard } from "@/components/life-card";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import type { IntakeJourneyKey } from "@/domain/intake-experience";
import { groupLifeItems, lifeItemCollection, type LifeItem } from "@/domain/life-item";

export default function JourneysPage() {
  const { dispatch } = useJourney();
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/journeys", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { journeys: JourneySummary[]; message?: string };
        if (!response.ok) throw new Error(body.message ?? "The people and things in your life could not be loaded.");
        setJourneys(body.journeys);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "The people and things in your life could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  function start(journey?: IntakeJourneyKey) {
    dispatch({ type: "set_statement", value: "" });
    router.push(journey ? `/intake?journey=${journey}` : "/intake");
  }
  const lifeItems = groupLifeItems(journeys);
  const activeItems = lifeItems.filter((item) => !item.completed);
  const completedItems = lifeItems.filter((item) => item.completed);
  return <main className="page hub-page journeys-index-page">
    <header className="hub-page-header content-layer"><div><p className="eyebrow"><Route />My life</p><h1>People and things in your life</h1><p>Keep their services, documents and upcoming responsibilities together.</p></div><button className="secondary-button" type="button" onClick={() => start()}><Plus />Tell us what changed</button></header>
    {error ? <p className="workflow-error content-layer" role="alert">{error}</p> : null}
    {loading ? <div className="collection-state content-layer" role="status"><LoaderCircle className="service-spinner" /><p>Loading your records…</p></div> : journeys.length ? <>
      <section className="journey-collection content-layer" aria-labelledby="active-journeys-title">
        <header><div><h2 id="active-journeys-title">Needs attention</h2><p>People and things with something to do now.</p></div><span>{activeItems.length}</span></header>
        {activeItems.length ? <LifeItemGroups items={activeItems} /> : <div className="journey-section-empty"><CheckCircle2 /><div><strong>Nothing needs your attention</strong><p>Everything here is caught up for now.</p></div></div>}
      </section>
      {completedItems.length ? <section id="all-caught-up" className="journey-collection completed-journeys content-layer" aria-labelledby="completed-journeys-title">
        <header><div><h2 id="completed-journeys-title">All caught up</h2><p>These people and things have no required steps right now. Their records and future responsibilities remain available.</p></div><span>{completedItems.length}</span></header>
        <LifeItemGroups items={completedItems} />
      </section> : null}
    </> : <section className="collection-state panel content-layer"><Route /><h2>Nothing here yet</h2><p>Tell us what changed. We’ll add the right person or thing and organise what follows.</p><div><button type="button" className="primary-cta" onClick={() => start("baby")}><Baby />We had a baby</button><button type="button" className="secondary-button" onClick={() => start("vehicle")}><Car />I bought a vehicle</button><button type="button" className="secondary-button" onClick={() => start("health")}><ShieldPlus />I need health cover</button></div></section>}
  </main>;
}

const collectionLabels = {
  family: { title: "My family", description: "Children, parents, partners and relatives you have identified." },
  people: { title: "Other people", description: "People connected to a service but not identified as family." },
  homes: { title: "Homes", description: "Homes and addresses you look after." },
  vehicles: { title: "Vehicles", description: "Vehicles you own, use or help manage." },
  businesses: { title: "Businesses", description: "Businesses and the people connected to them." },
} as const;

function LifeItemGroups({ items }: { items: LifeItem[] }) {
  return <div className="life-collection-groups">{Object.entries(collectionLabels).map(([key, copy]) => {
    const grouped = items.filter((item) => lifeItemCollection(item) === key);
    return grouped.length ? <section className="life-collection-group" aria-labelledby={`life-group-${key}`} key={key}><header><h3 id={`life-group-${key}`}>{copy.title}</h3><p>{copy.description}</p></header><div className="journey-card-grid">{grouped.map((item) => <LifeCard item={item} key={item.entityId} />)}</div></section> : null;
  })}</div>;
}
