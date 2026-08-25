"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Baby, Building2, CalendarDays, LockKeyhole, MapPin, Users } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { journeyIcons } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";

export default function JourneyRevealPage() {
  const { state } = useJourney();
  const [registration, certificate, ...downstream] = state.projection.nodes;
  return (
    <main className="page journey-page">
      <ScenicBackdrop />
      <Link href="/intake" className="floating-back content-layer"><ArrowLeft />Back to intake</Link>
      <section className="journey-heading content-layer"><h1>Your family journey is ready.</h1><p>We’ve assembled the right services around your child’s birth. Follow the journey below—we’ll guide you every step.</p></section>
      <section className="context-strip content-layer">
        <article><span className="mini-icon green"><Building2 /></span><div><small>Hospital</small><strong>Apollo Hospital</strong><em>Hyderabad</em></div></article>
        <article><span className="mini-icon purple"><Users /></span><div><small>Parents</small><strong>Ananya &amp; Rahul</strong><em>Sharma</em></div></article>
        <article><span className="mini-icon blue"><CalendarDays /></span><div><small>Date of birth</small><strong>24 August 2026</strong><em>Monday</em></div></article>
        <article><span className="mini-icon amber"><MapPin /></span><div><small>State</small><strong>Telangana</strong><em>India</em></div></article>
      </section>
      <section className="journey-graph panel content-layer" aria-label="Journey dependency graph">
        <p className="prefill-note">Some details have been pre-filled from your synthetic hospital and profile records.</p>
        <div className="graph-layout">
          <GraphNode node={registration} number={1} />
          <span className="graph-arrow"><ArrowRight /></span>
          <GraphNode node={certificate} number={2} />
          <div className="branch-line" aria-hidden="true" />
          <div className="downstream-list">
            {downstream.map((node, index) => {
              const Icon = journeyIcons[node.icon];
              return <article key={node.key} className="compact-node" title={node.status === "locked" ? "Complete birth registration first" : undefined}><span className="node-number">{index + 3}</span><span className={`event-icon tone-${index}`}><Icon /></span><div><strong>{node.title}</strong><p>{node.description}</p></div><span className="status locked"><LockKeyhole />Locked</span></article>;
            })}
          </div>
        </div>
      </section>
      <div className="primary-cta-wrap content-layer"><Link href="/journeys/demo-new-baby/birth-registration" className="primary-cta"><Baby />Review Birth Registration<ArrowRight /></Link><TrustNote>Your information is synthetic and encrypted in this demo.</TrustNote></div>
    </main>
  );
}

function GraphNode({ node, number }: { node: ReturnType<typeof useJourney>["state"]["projection"]["nodes"][number]; number: number }) {
  const Icon = journeyIcons[node.icon];
  return <article className={`graph-node ${node.status}`}><span className="node-number">{number}</span><span className="event-icon rose"><Icon /></span><strong>{node.title}</strong><p>{node.description}</p><span className={`status ${node.status}`}>{node.status === "locked" ? <LockKeyhole /> : null}{node.status === "in_progress" ? "In progress" : "Complete registration first"}</span></article>;
}
