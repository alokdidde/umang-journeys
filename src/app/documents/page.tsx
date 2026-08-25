"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Baby, Car, Download, Files, Filter, LoaderCircle, Plus, Search, ShieldCheck } from "lucide-react";
import { DocumentDesk } from "@/components/document-desk";
import { useCitizenHub } from "@/components/use-citizen-hub";
import type { DocumentLibraryItem } from "@/domain/citizen-hub";

type LibraryFilter = "all" | "uploaded" | "issued" | "needs_review";

export default function DocumentsPage() {
  const { snapshot, loading, error, refresh } = useCitizenHub();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => snapshot.documents.filter((document) => {
    if (filter === "uploaded" && document.origin !== "uploaded") return false;
    if (filter === "issued" && document.origin !== "issued") return false;
    if (filter === "needs_review" && document.status !== "needs_review") return false;
    const haystack = `${document.title} ${document.fileName ?? ""} ${document.journeyName ?? ""}`.toLocaleLowerCase("en-IN");
    return haystack.includes(query.trim().toLocaleLowerCase("en-IN"));
  }), [filter, query, snapshot.documents]);

  return <main className="page hub-page documents-page">
    <header className="hub-page-header content-layer">
      <div><p className="eyebrow"><Files />Documents</p><h1>Your documents</h1><p>Find a file, or add a new one.</p></div>
    </header>
    {error ? <p className="workflow-error content-layer" role="alert">{error}</p> : null}
    <details className="document-assistant-disclosure content-layer">
      <summary><span><Plus />Add a document</span><small>UMANG will read it and suggest where it belongs.</small></summary>
      <DocumentDesk onJourneyChanged={async () => { await refresh(); }} />
    </details>
    <section className="library-panel panel content-layer" aria-labelledby="library-heading">
      <header>
        <div><p className="eyebrow"><Filter />Your files</p><h2 id="library-heading">{filter === "all" ? "All documents" : filter === "uploaded" ? "Uploaded documents" : filter === "issued" ? "Issued records" : "Documents needing review"}</h2></div>
        <label className="library-search"><Search /><span className="sr-only">Search documents</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents or journeys" /></label>
      </header>
      <div className="library-filter-row" aria-label="Filter documents">
        {(["all", "uploaded", "issued", "needs_review"] as const).map((value) => <button type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value === "needs_review" ? "Needs review" : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}
      </div>
      {loading ? <div className="collection-state" role="status"><LoaderCircle className="service-spinner" /><p>Loading your documents…</p></div> : visible.length ? <div className="document-list">{visible.map((document) => <DocumentRow document={document} key={document.id} />)}</div> : <div className="collection-state"><Files /><h3>{query ? `No documents match “${query}”` : "No documents in this view"}</h3><p>{query ? "Clear the search or choose another filter." : "Add a document above or complete a journey service to create a record."}</p>{query ? <button type="button" className="secondary-button" onClick={() => setQuery("")}>Clear search</button> : null}</div>}
    </section>
  </main>;
}

function DocumentRow({ document }: { document: DocumentLibraryItem }) {
  const icon = document.category === "vehicle" ? <Car /> : document.category === "family" ? <Baby /> : <Files />;
  return <article className="document-row">
    <span className={`library-document-icon ${document.category}`}>{icon}</span>
    <div className="document-row-primary"><strong>{document.title}</strong><span>{document.fileName ?? "Interactive service record"}</span><small>{document.sourceLabel} · {formatDate(document.createdAt)}</small></div>
    <div className="document-row-journey">{document.journeyName ? <><small>Journey</small><Link href={`/journeys/${document.journeyId}`}>{document.journeyName}</Link></> : <><small>Journey</small><span>Not linked</span></>}</div>
    <em className={`document-library-status ${document.status}`}><ShieldCheck />{document.status === "available" ? "Available" : document.status === "applied" ? "Applied" : document.status === "rejected" ? "Dismissed" : "Needs review"}</em>
    <div className="document-row-actions">
      {document.downloadHref ? <a className="icon-action" href={document.downloadHref} target="_blank" rel="noreferrer" aria-label={`Download ${document.title}`}><Download /></a> : null}
      {document.origin === "issued"
        ? <Link className="row-link" href={document.href}>Open record<ArrowRight /></Link>
        : <a className="row-link" href={document.href} target="_blank" rel="noreferrer">View file<ArrowRight /></a>}
    </div>
  </article>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
