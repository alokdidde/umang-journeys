"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Baby, BadgeCheck, Check, Download, Gift, HeartPulse, IdCard, PartyPopper, RotateCcw, Syringe } from "lucide-react";
import { ScenicBackdrop } from "@/components/app-shell";
import { useJourney } from "@/components/journey-provider";

const nextSteps = [
  { key: "child_health_record", title: "Child Health Record", copy: "Create a digital health record and track milestones.", Icon: HeartPulse, tone: "green" },
  { key: "vaccination_timeline", title: "Vaccination Timeline", copy: "View recommended vaccines and reminders.", Icon: Syringe, tone: "blue" },
  { key: "child_identity", title: "Child Identity", copy: "Preview identity-document next steps.", Icon: IdCard, tone: "purple" },
  { key: "eligible_benefits", title: "Benefits You May Qualify For", copy: "Explore synthetic benefit recommendations.", Icon: Gift, tone: "amber" },
];

export default function SuccessPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loadJourney, resetJourney } = useJourney();
  useEffect(() => { if (id && state.journeyId !== id) void loadJourney(id); }, [id, loadJourney, state.journeyId]);
  if (state.pending && state.journeyId !== id) return <main className="page workflow-state"><p>Loading registration result…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>We couldn’t load this result.</h1><p>{state.error}</p><Link href="/intake" className="primary-cta">Start again</Link></main>;
  const childName = state.form.childName;
  const registrationId = state.registrationId;
  if (state.journeyId === id && !registrationId) return <main className="page workflow-state"><h1>Registration is not complete yet.</h1><Link className="primary-cta" href={`/journeys/${id}/birth-registration`}>Complete registration</Link></main>;
  return (
    <main className="page success-page">
      <ScenicBackdrop />
      <section className="success-hero content-layer">
        <div className="success-copy"><span className="success-pill"><Check />Success!</span><h1>Birth registered <PartyPopper /></h1><p>One important step is complete. We created a synthetic birth record and unlocked the next steps.</p></div>
        <article className="certificate-card">
          <div className="certificate-watermark">SANDBOX</div>
          <header><span className="certificate-icon"><Baby /></span><div><h2>Birth Certificate</h2><p><BadgeCheck />Synthetic verified record</p></div><span className="registered-tag"><Check />Registered</span></header>
          <div className="certificate-grid"><div><small>Child’s name</small><strong>{childName}</strong></div><div><small>Registration no.</small><strong>{registrationId}</strong></div><div><small>Date of birth</small><strong>{state.facts["child.dateOfBirth"] ?? "24 August 2026"}</strong></div><div><small>Place of birth</small><strong>{state.facts["birth.city"] ?? "Hyderabad"}, {state.facts["birth.state"] ?? "Telangana"}</strong></div></div>
          <Link href={`/journeys/${id}/services/birth_certificate`} className="download-button"><Download />Generate sandbox certificate</Link>
        </article>
      </section>
      <section className="next-section content-layer"><h2>What’s next?</h2><p>Continue building your child’s foundation. We’ve unlocked the next essentials for you.</p><div className="next-cards">{nextSteps.map(({ key, title, copy, Icon, tone }) => { const completed = state.projection.nodes.find((node) => node.key === key)?.status === "completed"; return <Link href={`/journeys/${id}/services/${key}`} key={title}><span className={`event-icon ${tone}`}><Icon /></span><div><h3>{title}</h3><p>{copy}</p></div><span className={`status ${tone}`}>{completed ? "Completed" : "Ready to start"}</span><ArrowRight /></Link>; })}</div></section>
      <section className="progress-section content-layer"><h2>Your journey progress</h2><div className="progress-track"><div className="progress-item done"><span><Check /></span><strong>Birth registered</strong><small>24 Aug 2026</small></div>{nextSteps.map(({ title, Icon }) => <div className="progress-item" key={title}><span><Icon /></span><strong>{title}</strong><small>Upcoming</small></div>)}</div></section>
      <div className="success-actions content-layer"><Link href={`/journeys/${id}`} className="primary-cta">Continue Journey<ArrowRight /></Link><button type="button" className="secondary-button" onClick={async () => { await resetJourney(); router.push("/"); }}><RotateCcw />Reset sandbox</button></div>
      <p className="simulation-banner content-layer">Prototype — this registration is simulated. No government system was contacted.</p>
    </main>
  );
}
