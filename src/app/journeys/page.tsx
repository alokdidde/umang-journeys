"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Car, LoaderCircle, Plus, Route, ShieldPlus } from "lucide-react";
import { LifeCard } from "@/components/life-card";
import { useJourney } from "@/components/journey-provider";
import type { JourneySummary } from "@/domain/journey-summary";
import type { IntakeJourneyKey } from "@/domain/intake-experience";
import { groupLifeItems, lifeItemCollection, type LifeEntityRecordProjection, type LifeItem } from "@/domain/life-item";

export default function JourneysPage() {
  const { dispatch } = useJourney();
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [entities, setEntities] = useState<LifeEntityRecordProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/life", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { journeys: JourneySummary[]; entities: LifeEntityRecordProjection[]; message?: string };
        if (!response.ok) throw new Error(body.message ?? "The people and things in your life could not be loaded.");
        setJourneys(body.journeys);
        setEntities(body.entities);
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
  const lifeItems = groupLifeItems(journeys, entities);
  const activeItems = lifeItems.filter((item) => item.state === "attention");
  const unavailableItems = lifeItems.filter((item) => item.state === "guidance_unavailable");
  const completedItems = lifeItems.filter((item) => item.state === "caught_up");
  return <main className="page hub-page journeys-index-page">
    <header className="hub-page-header content-layer"><div><p className="eyebrow"><Route />My life</p><h1>People and things in your life</h1><p>Keep their services, documents and upcoming responsibilities together.</p></div><button className="secondary-button" type="button" onClick={() => start()}><Plus />Tell us what changed</button></header>
    {error ? <p className="workflow-error content-layer" role="alert">{error}</p> : null}
    {loading ? <div className="collection-state content-layer" role="status"><LoaderCircle className="service-spinner" /><p>Loading your records…</p></div> : lifeItems.length ? <>
      {activeItems.length ? <section className="journey-collection content-layer" aria-labelledby="active-journeys-title">
        <header><div><h2 id="active-journeys-title">Needs attention</h2><p>People and things with something to do now.</p></div><span>{activeItems.length}</span></header>
        <LifeItemGroups items={activeItems} />
      </section> : null}
      {unavailableItems.length ? <section id="guidance-unavailable" className="journey-collection guidance-unavailable-collection content-layer" aria-labelledby="guidance-unavailable-title">
        <header><div><h2 id="guidance-unavailable-title">Saved without guided steps</h2><p>These requests are saved, but UMANG Life does not yet have verified steps for them.</p></div><span>{unavailableItems.length}</span></header>
        <LifeItemGroups items={unavailableItems} />
      </section> : null}
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
  homes_property: { title: "Homes & property", description: "Homes, premises, land and property you look after." },
  vehicles_assets: { title: "Vehicles & assets", description: "Vehicles and registered assets you own, use or help manage." },
  work_organisations: { title: "Work & organisations", description: "Businesses, organisations and the people connected to them." },
  other: { title: "Other records", description: "Animals, estates and other registered records you manage." },
} as const;

function LifeItemGroups({ items }: { items: LifeItem[] }) {
  return <div className="life-collection-groups">{Object.entries(collectionLabels).map(([key, copy]) => {
    const grouped = items.filter((item) => lifeItemCollection(item) === key);
    return grouped.length ? <section className="life-collection-group" aria-labelledby={`life-group-${key}`} key={key}><header><h3 id={`life-group-${key}`}>{copy.title}</h3><p>{copy.description}</p></header><div className="journey-card-grid">{grouped.map((item) => <LifeCard item={item} key={item.entityId} />)}</div></section> : null;
  })}</div>;
}
