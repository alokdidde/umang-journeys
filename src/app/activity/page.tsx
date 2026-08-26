"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Baby, CalendarClock, FileText, Filter, LoaderCircle, Route } from "lucide-react";
import { useCitizenHub } from "@/components/use-citizen-hub";
import type { ActivityItem, CitizenTask } from "@/domain/citizen-hub";

type ActivityFilter = "all" | ActivityItem["type"];

export default function ActivityPage() {
  const { snapshot, loading, error } = useCitizenHub();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [view, setView] = useState<"tasks" | "history">("tasks");
  const visible = useMemo(() => filter === "all" ? snapshot.activity : snapshot.activity.filter((item) => item.type === filter), [filter, snapshot.activity]);
  const groups = useMemo(() => groupByDay(visible), [visible]);
  return <main className="page hub-page activity-page">
    <header className="hub-page-header content-layer"><div><p className="eyebrow"><Activity />Tasks and activity</p><h1>What needs your attention</h1><p>See what to do next, or look back at changes to your account.</p></div></header>
    {error ? <p className="workflow-error content-layer" role="alert">{error}</p> : null}
    <div className="activity-view-tabs content-layer" role="tablist" aria-label="Tasks and history"><button role="tab" aria-selected={view === "tasks"} onClick={() => setView("tasks")}>To do <span>{snapshot.tasks.length}</span></button><button role="tab" aria-selected={view === "history"} onClick={() => setView("history")}>History</button></div>
    {view === "history" ? <section className="activity-toolbar panel content-layer" aria-label="Activity filters"><span><Filter />Show</span>{(["all", "journey", "document", "service"] as const).map((value) => <button type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value === "all" ? "Everything" : value === "journey" ? "Journeys" : value === "document" ? "Documents" : "Services"}</button>)}</section> : null}
    {loading ? <div className="collection-state content-layer" role="status"><LoaderCircle className="service-spinner" /><p>Loading your account…</p></div> : view === "tasks" ? snapshot.tasks.length ? <section className="task-list panel content-layer" aria-label="Your tasks">{snapshot.tasks.map((task) => <TaskRow task={task} key={task.id} />)}</section> : <div className="collection-state panel content-layer"><CalendarClock /><h2>You’re caught up</h2><p>There are no open tasks. New provider messages and journey steps will appear here.</p></div> : groups.length ? <div className="activity-groups content-layer">{groups.map(([day, items]) => <section key={day} aria-labelledby={`activity-${day}`}><h2 id={`activity-${day}`}>{day}</h2><ol>{items.map((item) => <ActivityRow item={item} key={item.id} />)}</ol></section>)}</div> : <div className="collection-state panel content-layer"><Activity /><h2>No activity in this view</h2><p>Choose another filter or add a document to create the first entry.</p><Link className="primary-cta" href="/documents">Add a document<ArrowRight /></Link></div>}
  </main>;
}

function TaskRow({ task }: { task: CitizenTask }) {
  return <Link className={`task-row ${task.priority}`} href={task.href}><span><CalendarClock /></span><div><strong>{task.title}</strong><p>{task.detail}</p><small>{task.journeyName}{task.dueAt ? ` · Suggested by ${formatDate(task.dueAt)}` : task.priority === "waiting" ? " · Waiting for provider" : ""}</small></div><em>{task.priority === "now" ? "Needs you" : task.priority === "waiting" ? "Waiting" : "Next"}</em><ArrowRight /></Link>;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(value));
}
