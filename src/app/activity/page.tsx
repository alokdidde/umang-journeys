"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Baby, FileText, Filter, LoaderCircle, Route } from "lucide-react";
import { useCitizenHub } from "@/components/use-citizen-hub";
import type { ActivityItem } from "@/domain/citizen-hub";

type ActivityFilter = "all" | ActivityItem["type"];

export default function ActivityPage() {
  const { snapshot, loading, error } = useCitizenHub();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const visible = useMemo(() => filter === "all" ? snapshot.activity : snapshot.activity.filter((item) => item.type === filter), [filter, snapshot.activity]);
  const groups = useMemo(() => groupByDay(visible), [visible]);
  return <main className="page hub-page activity-page">
    <header className="hub-page-header content-layer"><div><p className="eyebrow"><Activity />Account ledger</p><h1>Activity</h1><p>A timestamped history of journey changes, document decisions, and sandbox provider checks.</p></div><Link className="secondary-button" href="/documents">Open document library<ArrowRight /></Link></header>
    {error ? <p className="workflow-error content-layer" role="alert">{error}</p> : null}
    <section className="activity-toolbar panel content-layer" aria-label="Activity filters"><span><Filter />Show</span>{(["all", "journey", "document", "service"] as const).map((value) => <button type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value === "all" ? "Everything" : value === "journey" ? "Journeys" : value === "document" ? "Documents" : "Services"}</button>)}</section>
    {loading ? <div className="collection-state content-layer" role="status"><LoaderCircle className="service-spinner" /><p>Loading your activity…</p></div> : groups.length ? <div className="activity-groups content-layer">{groups.map(([day, items]) => <section key={day} aria-labelledby={`activity-${day}`}><h2 id={`activity-${day}`}>{day}</h2><ol>{items.map((item) => <ActivityRow item={item} key={item.id} />)}</ol></section>)}</div> : <div className="collection-state panel content-layer"><Activity /><h2>No activity in this view</h2><p>Choose another filter or add a document to create the first entry.</p><Link className="primary-cta" href="/documents">Add a document<ArrowRight /></Link></div>}
  </main>;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icon = item.type === "document" ? <FileText /> : item.type === "journey" ? <Baby /> : <Route />;
  const content = <><span className={`activity-icon ${item.type}`}>{icon}</span><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.journeyName ? `${item.journeyName} · ` : ""}{formatTime(item.occurredAt)}</small></div>{item.href ? <ArrowRight className="activity-arrow" /> : null}</>;
  return <li>{item.href ? <Link href={item.href}>{content}</Link> : <article>{content}</article>}</li>;
}

function groupByDay(items: ActivityItem[]) {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const key = new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date(item.occurredAt));
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()];
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
