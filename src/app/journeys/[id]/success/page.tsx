"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Baby, BadgeCheck, Check, Download, PartyPopper } from "lucide-react";
import { ScenicBackdrop } from "@/components/app-shell";
import { useJourney } from "@/components/journey-provider";

export default function SuccessPage() {
  const { id } = useParams<{ id: string }>();
  const { state, loadJourney } = useJourney();
  useEffect(() => { if (id && state.journeyId !== id) void loadJourney(id); }, [id, loadJourney, state.journeyId]);
  if (state.journeyId !== id && !state.error) return <main className="page workflow-state"><p>Loading registration result…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>We couldn’t load this result.</h1><p>{state.error}</p><Link href="/intake" className="primary-cta">Start again</Link></main>;
  const childName = state.form.childName;
  const registrationId = state.registrationId;
  if (state.journeyId === id && !registrationId) return <main className="page workflow-state"><h1>Registration is not complete yet.</h1><Link className="primary-cta" href={`/journeys/${id}/birth-registration`}>Complete registration</Link></main>;
  return (
    <main className="page success-page">
      <ScenicBackdrop />
      <section className="success-hero content-layer">
        <div className="success-copy"><span className="success-pill"><Check />Step complete</span><h1>Birth registered <PartyPopper /></h1><p>The synthetic record is saved. Your next step is to generate the birth certificate.</p></div>
        <article className="certificate-card">
          <div className="certificate-watermark">SANDBOX</div>
          <header><span className="certificate-icon"><Baby /></span><div><h2>Birth Certificate</h2><p><BadgeCheck />Synthetic verified record</p></div><span className="registered-tag"><Check />Registered</span></header>
          <div className="certificate-grid"><div><small>Child’s name</small><strong>{childName}</strong></div><div><small>Registration no.</small><strong>{registrationId}</strong></div><div><small>Date of birth</small><strong>{state.facts["child.dateOfBirth"] ?? "24 August 2026"}</strong></div><div><small>Place of birth</small><strong>{state.facts["birth.city"] ?? "Hyderabad"}, {state.facts["birth.state"] ?? "Telangana"}</strong></div></div>
          <Link href={`/journeys/${id}/services/birth_certificate`} className="primary-cta"><Download />Generate birth certificate<ArrowRight /></Link>
        </article>
      </section>
      <div className="success-actions content-layer"><Link href={`/journeys/${id}`} className="secondary-button">View the whole journey<ArrowRight /></Link></div>
      <p className="simulation-banner content-layer">Prototype — this registration is simulated. No government system was contacted.</p>
    </main>
  );
}
