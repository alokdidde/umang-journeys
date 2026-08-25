"use client";

import Link from "next/link";
import { ArrowRight, Baby, BadgeCheck, Check, Download, Gift, HeartPulse, IdCard, PartyPopper, RotateCcw, Syringe } from "lucide-react";
import { ScenicBackdrop } from "@/components/app-shell";
import { useJourney } from "@/components/journey-provider";

const nextSteps = [
  { title: "Child Health Record", copy: "Create a digital health record and track milestones.", Icon: HeartPulse, status: "Unlocked", tone: "green" },
  { title: "Vaccination Timeline", copy: "View recommended vaccines and reminders.", Icon: Syringe, status: "Ready to start", tone: "blue" },
  { title: "Child Identity", copy: "Preview identity-document next steps.", Icon: IdCard, status: "Recommended soon", tone: "purple" },
  { title: "Benefits You May Qualify For", copy: "Explore synthetic benefit recommendations.", Icon: Gift, status: "Ready to review", tone: "amber" },
];

export default function SuccessPage() {
  const { state, dispatch } = useJourney();
  const childName = state.form.childName || "Aarav Sharma";
  return (
    <main className="page success-page">
      <ScenicBackdrop />
      <section className="success-hero content-layer">
        <div className="success-copy"><span className="success-pill"><Check />Success!</span><h1>Birth registered <PartyPopper /></h1><p>One important step is complete. We created a synthetic birth record and unlocked the next steps.</p></div>
        <article className="certificate-card">
          <div className="certificate-watermark">DEMO</div>
          <header><span className="certificate-icon"><Baby /></span><div><h2>Birth Certificate</h2><p><BadgeCheck />Synthetic verified record</p></div><span className="registered-tag"><Check />Registered</span></header>
          <div className="certificate-grid"><div><small>Child’s name</small><strong>{childName}</strong></div><div><small>Registration no.</small><strong>{state.registrationId ?? "BR-DEMO-2026-7429"}</strong></div><div><small>Date of birth</small><strong>24 August 2026</strong></div><div><small>Place of birth</small><strong>Hyderabad, Telangana</strong></div></div>
          <Link href="/api/journeys/demo-new-baby/certificate" prefetch={false} className="download-button"><Download />Download DEMO certificate</Link>
        </article>
      </section>
      <section className="next-section content-layer"><h2>What’s next?</h2><p>Continue building your child’s foundation. We’ve unlocked the next essentials for you.</p><div className="next-cards">{nextSteps.map(({ title, copy, Icon, status, tone }) => <article key={title}><span className={`event-icon ${tone}`}><Icon /></span><div><h3>{title}</h3><p>{copy}</p></div><span className={`status ${tone}`}>{status}</span><ArrowRight /></article>)}</div></section>
      <section className="progress-section content-layer"><h2>Your journey progress</h2><div className="progress-track"><div className="progress-item done"><span><Check /></span><strong>Birth registered</strong><small>24 Aug 2026</small></div>{nextSteps.map(({ title, Icon }) => <div className="progress-item" key={title}><span><Icon /></span><strong>{title}</strong><small>Upcoming</small></div>)}</div></section>
      <div className="success-actions content-layer"><Link href="/journeys/demo-new-baby" className="primary-cta">Continue Journey<ArrowRight /></Link><button type="button" className="secondary-button" onClick={() => dispatch({ type: "reset" })}><RotateCcw />Reset demo</button></div>
      <p className="simulation-banner content-layer">Prototype — this registration is simulated. No government system was contacted.</p>
    </main>
  );
}
