"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, ExternalLink, FlaskConical, ShieldCheck } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

const serviceDetails: Record<string, { agency: string; action: string; explanation: string }> = {
  birth_certificate: { agency: "Civil Registration Sandbox", action: "Generate certificate", explanation: "Simulates a civil registry issuing a watermarked, non-official birth certificate." },
  child_health_record: { agency: "ABDM Sandbox", action: "Create health record", explanation: "Simulates creating a private child health record and linking verified birth details." },
  vaccination_timeline: { agency: "U-WIN Sandbox", action: "Build vaccination timeline", explanation: "Creates an age-based schedule and upcoming reminders from the recorded date of birth." },
  child_identity: { agency: "Identity Guidance Sandbox", action: "Prepare identity checklist", explanation: "Prepares the documents and consent steps for identity enrollment without filing an application." },
  eligible_benefits: { agency: "Benefits Exchange Sandbox", action: "Match family benefits", explanation: "Matches profile facts to potential schemes. Results are suggestions, never eligibility decisions." },
};

export default function SandboxServicePage() {
  const { id, key } = useParams<{ id: string; key: string }>();
  const { state, loadJourney, completeService } = useJourney();
  const details = serviceDetails[key];
  const node = state.projection.nodes.find((candidate) => candidate.key === key);
  const receipt = state.journeyId === id ? state.facts?.[`service.${key}.receipt`] : undefined;

  useEffect(() => {
    if (id && state.journeyId !== id) void loadJourney(id);
  }, [id, loadJourney, state.journeyId]);

  if (!details) return <main className="page workflow-state"><h1>Service not found</h1><Link href={`/journeys/${id}`}>Return to journey</Link></main>;
  if (state.pending && state.journeyId !== id) return <main className="page workflow-state"><p>Loading sandbox service…</p></main>;
  if (node?.status === "locked") return <main className="page workflow-state"><h1>This service is still locked.</h1><p>Complete the birth registration first.</p><Link className="primary-cta" href={`/journeys/${id}`}>Return to journey</Link></main>;

  const completed = node?.status === "completed";
  return (
    <main className="page service-page">
      <Link href={`/journeys/${id}`} className="floating-back"><ArrowLeft />Back to journey</Link>
      <section className="service-panel panel">
        <span className="service-emblem"><FlaskConical /></span>
        <p className="eyebrow">Simulated external service</p>
        <h1>{node?.title ?? key}</h1>
        <p>{details.explanation}</p>
        <dl className="service-details">
          <div><dt>Connected provider</dt><dd>{details.agency}</dd></div>
          <div><dt>Data shared</dt><dd>Only the synthetic birth details needed for this step</dd></div>
          <div><dt>Environment</dt><dd><ShieldCheck /> Evaluation sandbox — no real submission</dd></div>
        </dl>
        {completed ? (
          <div className="service-result" role="status"><BadgeCheck /><div><strong>Sandbox service completed</strong><p>{state.facts?.[`service.${key}.summary`]}</p><small>Receipt {receipt}</small></div></div>
        ) : (
          <button className="primary-cta service-action" type="button" disabled={state.pending} onClick={() => void completeService(id, key)}>
            {state.pending ? "Connecting to sandbox…" : details.action}<ExternalLink />
          </button>
        )}
        {state.error ? <p className="workflow-error" role="alert">{state.error}</p> : null}
        {completed && key === "birth_certificate" ? <Link className="download-button" href={`/api/journeys/${id}/certificate`} prefetch={false}>Download sandbox certificate</Link> : null}
        {completed ? <Link className="secondary-button service-return" href={`/journeys/${id}`}><Check />Continue journey</Link> : null}
      </section>
    </main>
  );
}
