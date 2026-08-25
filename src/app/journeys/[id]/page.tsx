"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Building2, CalendarDays, LockKeyhole, MapPin, Users } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { journeyIcons } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import { isSandboxServiceKey } from "@/domain/service-workflows";

export default function JourneyRevealPage() {
  const { state, loadJourney } = useJourney();
  const { id } = useParams<{ id: string }>();
  useEffect(() => {
    if (id && state.journeyId !== id) void loadJourney(id);
  }, [id, loadJourney, state.journeyId]);
  if (state.pending && state.journeyId !== id) return <main className="page workflow-state"><p>Loading your journey…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>We couldn’t load this journey.</h1><p>{state.error}</p><Link href="/intake" className="primary-cta">Start again</Link></main>;
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
          <GraphNode node={certificate} number={2} href={certificate.status === "locked" ? undefined : `/journeys/${id}/services/birth_certificate`} />
          <div className="branch-line" aria-hidden="true" />
          <div className="downstream-list">
            {downstream.map((node, index) => {
              const Icon = journeyIcons[node.icon];
              const run = isSandboxServiceKey(node.key) ? state.serviceRuns[node.key] : undefined;
              const status = node.status === "locked" ? "Locked" : node.status === "completed" ? "Completed" : node.status === "waiting_external" ? "Waiting for provider" : node.status === "in_progress" ? `${run?.progress ?? 0}% complete` : "Ready to start";
              const contents = <><span className="node-number">{index + 3}</span><span className={`event-icon tone-${index}`}><Icon /></span><div><strong>{node.title}</strong><p>{node.description}</p></div><span className={`status ${node.status}`}>{node.status === "locked" && <LockKeyhole />}{status}</span></>;
              return node.status === "locked"
                ? <article key={node.key} className="compact-node" title="Complete birth registration first">{contents}</article>
                : <Link key={node.key} href={`/journeys/${id}/services/${node.key}`} className="compact-node service-node-link">{contents}</Link>;
            })}
          </div>
        </div>
      </section>
      <div className="primary-cta-wrap content-layer"><Link href={registration.status === "completed" ? `/journeys/${id}/services/birth_certificate` : `/journeys/${id}/birth-registration`} className="primary-cta"><Baby />{registration.status === "completed" ? "Continue with birth certificate" : "Review birth registration"}<ArrowRight /></Link><TrustNote>Your information stays within this evaluation sandbox.</TrustNote></div>
    </main>
  );
}

function GraphNode({ node, number, href }: { node: ReturnType<typeof useJourney>["state"]["projection"]["nodes"][number]; number: number; href?: string }) {
  const Icon = journeyIcons[node.icon];
  const label = node.status === "locked" ? "Complete registration first" : node.status === "completed" ? "Completed" : node.status === "in_progress" ? "In progress" : "Available";
  const contents = <><span className="node-number">{number}</span><span className="event-icon rose"><Icon /></span><strong>{node.title}</strong><p>{node.description}</p><span className={`status ${node.status}`}>{node.status === "locked" ? <LockKeyhole /> : null}{label}</span></>;
  return href ? <Link href={href} className={`graph-node service-node-link ${node.status}`}>{contents}</Link> : <article className={`graph-node ${node.status}`}>{contents}</article>;
}
