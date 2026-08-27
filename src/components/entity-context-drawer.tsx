"use client";

import Link from "next/link";
import { CalendarDays, FileText, Link2, UserRound, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { evidenceLabels, type JourneyEvidence } from "@/domain/evidence";
import type { JourneySubject } from "@/domain/journey-summary";

type ContextDetail = { label: string; value: string };

export function EntityContextDrawer({ subject, details, evidence }: { subject: JourneySubject; details: ContextDetail[]; evidence: JourneyEvidence[] }) {
  const people = subject.context?.connectedPeople ?? [];
  return <DialogPrimitive.Root>
    <DialogPrimitive.Trigger asChild>
      <button type="button" className="life-plan-about"><UserRound aria-hidden="true" />About {subject.displayName}</button>
    </DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="entity-drawer-overlay" />
      <DialogPrimitive.Content className="entity-drawer" aria-describedby="entity-drawer-description">
        <header className="entity-drawer-header">
          <div><p className="eyebrow">In My life</p><DialogPrimitive.Title>{subject.displayName}</DialogPrimitive.Title></div>
          <DialogPrimitive.Close className="entity-drawer-close" aria-label="Close details"><X aria-hidden="true" /></DialogPrimitive.Close>
        </header>
        <DialogPrimitive.Description id="entity-drawer-description">The person or thing this plan belongs to.</DialogPrimitive.Description>

        <section className="entity-drawer-section" aria-labelledby="record-details-heading">
          <h3 id="record-details-heading"><CalendarDays aria-hidden="true" />Key details</h3>
          <dl>{details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
        </section>

        {people.length > 0 ? <section className="entity-drawer-section" aria-labelledby="connected-people-heading">
          <h3 id="connected-people-heading"><Link2 aria-hidden="true" />Connected people</h3>
          <div className="entity-drawer-people">{people.map((person) => <article key={person.entityId}><span><UserRound aria-hidden="true" /></span><div><strong>{person.displayName}</strong><small>{person.roles.join(" · ") || "Connected person"}</small></div></article>)}</div>
        </section> : null}

        <section className="entity-drawer-section" aria-labelledby="documents-heading">
          <h3 id="documents-heading"><FileText aria-hidden="true" />Documents in this plan</h3>
          {evidence.length > 0 ? <ul className="entity-drawer-documents">{evidence.map((item) => <li key={item.id}><FileText aria-hidden="true" /><span>{evidenceLabels[item.type].title}</span></li>)}</ul> : <p className="entity-drawer-empty">No documents have been added yet.</p>}
        </section>

        {subject.canonicalEntityId ? <Link href={`/life/${subject.canonicalEntityId}`} className="entity-drawer-record-link">Open the full record <span aria-hidden="true">→</span></Link> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
